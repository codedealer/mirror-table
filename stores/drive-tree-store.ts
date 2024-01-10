import { acceptHMRUpdate, defineStore } from 'pinia';
import { DriveFileExtensions } from '~/models/types';
import type {
  AppProperties,
  AssetPropertiesKind,
  DriveFile,
  DriveTreeNode,
} from '~/models/types';

import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { buildNodes } from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';

export const useDriveTreeStore = defineStore('drive-tree', () => {
  const rootNode = ref<DriveTreeNode>({
    id: '',
    label: '',
    isFolder: true,
    loaded: false,
    loading: false,
    disabled: false,
    $folded: false,
  } as DriveTreeNode);

  const nodes = computed(() => {
    return rootNode.value.children ?? [];
  });

  const driveStore = useDriveStore();
  const userStore = useUserStore();

  const { isReady } = storeToRefs(driveStore);
  const { profile } = storeToRefs(userStore);

  const searchModalState = ref(false);

  const isRootFolder = computed(() => {
    if (!rootNode.value || !profile.value) {
      // passthrough until initialized
      return true;
    }

    return rootNode.value.id === profile.value.settings.driveFolderId;
  });

  const setNodeLoading = (node: DriveTreeNode, loading: boolean) => {
    node.loading = loading;
    if (node.children) {
      node.children.forEach(child => setNodeLoading(child, loading));
    }
  };

  const loadChildren = async (node: DriveTreeNode) => {
    let success = false;

    try {
      setNodeLoading(node, true);

      const driveFileStore = useDriveFileStore();

      node.children = buildNodes(await driveFileStore.listFilesInFolder(node.id));

      node.loaded = true;
      success = true;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      if (node) {
        setNodeLoading(node, false);
      }
    }

    return success;
  };

  const setRootFolder = async (newRootNode?: DriveTreeNode) => {
    let success = false;

    if (!profile.value) {
      throw new Error('Setting Drive root when profile is not loaded');
    }

    try {
      if (newRootNode === undefined) {
        rootNode.value = {
          id: profile.value.settings.driveFolderId,
          label: '',
          isFolder: true,
          loaded: false,
          loading: false,
          disabled: false,
          $folded: false,
        };
      } else {
        rootNode.value = structuredClone(toRaw(newRootNode));
      }

      rootNode.value.loading = true;

      await driveWorkspaceSentinel();

      success = await loadChildren(rootNode.value);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      rootNode.value.loading = false;
    }

    return success;
  };

  watch([profile, isReady], async ([profile, isReady]) => {
    if (rootNode.value.loading || rootNode.value.loaded || !isReady || !profile) {
      return;
    }

    await setRootFolder();
  }, { immediate: true });

  const setRootToParent = async () => {
    const driveFileStore = useDriveFileStore();
    const rootFile = driveFileStore.files[rootNode.value.id];
    if (!rootNode.value || !rootFile?.parents) {
      return false;
    }

    const parentId = rootFile.parents[0];

    if (!parentId) {
      return false;
    }

    let parentNode: DriveTreeNode;
    try {
      rootNode.value.loading = true;

      const parentFile = await driveFileStore.getFile(parentId);

      if (!parentFile) {
        throw new Error('Parent file not found');
      }

      parentNode = DriveTreeNodeFactory(parentFile);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
      return false;
    } finally {
      rootNode.value.loading = false;
    }

    return await setRootFolder(parentNode);
  };

  const toggleFold = async (node: DriveTreeNode, path: number[]) => {
    const MAX_DEPTH = 3;

    if (!node.isFolder) {
      return false;
    }

    if (path.length > MAX_DEPTH) {
      // instead of unfolding further, reload tree with this node as root
      return await setRootFolder(node);
    }

    if (node.loaded) {
      node.$folded = !node.$folded;
      return true;
    }

    const result = await loadChildren(node);

    if (result) {
      node.$folded = false;
    }

    return result;
  };

  const createChild = async (
    nameOrFile: string | File,
    parent: DriveTreeNode,
    parentPath: number[] = [],
    appProperties?: AppProperties,
  ) => {
    let success = false;

    try {
      setNodeLoading(parent, true);

      const driveFileStore = useDriveFileStore();
      await driveFileStore.createFile(nameOrFile, parent.id, appProperties);

      // update and unfold the parent folder
      success = await loadChildren(parent);

      if (parent.$folded) {
        success = success && await toggleFold(parent, parentPath);
      }
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      setNodeLoading(parent, false);
    }

    return success;
  };

  const removeFile = async (node: DriveTreeNode, restore = false) => {
    try {
      setNodeLoading(node, true);

      const driveFileStore = useDriveFileStore();
      await driveFileStore.removeFile(node.id, restore);

      if (node.isFolder && !restore) {
        node.$folded = true;
      }

      node.disabled = !restore;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      setNodeLoading(node, false);
    }
  };

  const setNodeLabel = (node: DriveTreeNode, label: string) => {
    node.label = label;
  };

  const quickCreateAssets = async (
    kind: AssetPropertiesKind,
    ids: string[],
    parent: DriveTreeNode,
    path?: number[],
  ) => {
    let images: DriveFile[] = [];

    setNodeLoading(parent, true);

    const driveFileStore = useDriveFileStore();

    try {
      images = await driveFileStore.getFiles(ids);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }

    // create an asset for each image, set images as preview
    for (const image of images) {
      const fileName = stripFileExtension(image.name);
      const fileType = DriveMimeTypes.MARKDOWN;
      const fileExtension = DriveFileExtensions[fileType];

      const fileObject = new File(
        [],
        `${fileName}.${fileExtension}`,
        { type: fileType },
      );

      const appProperties = AssetPropertiesFactory({
        type: AppPropertiesTypes.ASSET,
        kind,
      });

      appProperties.preview = PreviewPropertiesFactory({
        id: image.id,
        nativeWidth: image.imageMediaMetadata!.width,
        nativeHeight: image.imageMediaMetadata!.height,
      });

      console.log(`Creating asset for ${image.name}`);
      try {
        await driveFileStore.createFile(fileObject, parent.id, appProperties);
      } catch (e) {
        console.error(e);
        const notificationStore = useNotificationStore();
        notificationStore.error(extractErrorMessage(e));

        break;
      }
    }

    const success = await loadChildren(parent);

    if (success && parent.$folded) {
      await toggleFold(parent, path ?? []);
    }

    setNodeLoading(parent, false);
  };

  const importImages = async (
    kind: AssetPropertiesKind,
    parentNode: DriveTreeNode,
    path?: number[],
  ) => {
    const { buildPicker } = usePicker();
    const userStore = useUserStore();

    try {
      await buildPicker({
        parentId: userStore.profile!.settings.driveFolderId,
        uploadParentId: parentNode.id,
        template: PickerViewTemplates.IMAGES,
        allowMultiSelect: true,
        allowUpload: true,
        callback: (result) => {
          if (
            result.action === google.picker.Action.PICKED &&
            result.docs.length > 0
          ) {
            const ids = result.docs.map(d => d.id);

            void quickCreateAssets(kind, ids, parentNode, path);
          }
        },
      });
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }
  };

  return {
    searchModalState,
    nodes,
    rootNode,
    isRootFolder,
    setRootFolder,
    setRootToParent,
    loadChildren,
    toggleFold,
    createChild,
    removeFile,
    setNodeLoading,
    setNodeLabel,
    importImages,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
