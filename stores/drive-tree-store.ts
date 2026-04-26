import type {
  AppProperties,
  AssetPropertiesKind,
  DriveFile,
  DriveTreeNode,
} from '~/models/types';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';

import { DriveFileExtensions } from '~/models/types';
import { buildNodes, moveFile } from '~/utils/driveOps';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export const useDriveTreeStore = defineStore('drive-tree', () => {
  const rootNode = ref<DriveTreeNode>({
    id: '',
    label: '',
    isFolder: true,
    loaded: false,
    loading: false,
    disabled: false,
  } as DriveTreeNode);

  const nodes = computed(() => {
    return rootNode.value.children ?? [];
  });

  const driveStore = useDriveStore();
  const userStore = useUserStore();
  const driveSearchStore = useDriveSearchStore();

  const { isReady } = storeToRefs(driveStore);
  const { profile } = storeToRefs(userStore);

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
    if (!rootNode.value) {
      return false;
    }

    let rootFile: DriveFile | undefined;
    try {
      ({ file: rootFile } = await driveFileStore.getFile(
        rootNode.value.id,
        DataRetrievalStrategies.CACHE_ONLY,
      ));
    } catch {
      // If cache is missing, we cannot resolve parent without fetching.
      return false;
    }

    if (!rootFile?.parents) {
      return false;
    }

    const parentId = rootFile.parents[0];

    if (!parentId) {
      return false;
    }

    let parentNode: DriveTreeNode;
    try {
      rootNode.value.loading = true;

      const { file: parentFile } = await driveFileStore.getFile(parentId);

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

  const createChild = async (
    nameOrFile: string | File,
    parent: DriveTreeNode,
    appProperties?: AppProperties,
  ) => {
    let success = false;

    try {
      setNodeLoading(parent, true);

      const driveFileStore = useDriveFileStore();
      await driveFileStore.createFile(nameOrFile, parent.id, appProperties);

      // update and unfold the parent folder
      success = await loadChildren(parent);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
      console.error(e);
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
        // Folder will be collapsed by the tree component when disabled
      }

      node.disabled = !restore;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
      console.error(e);
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
  ) => {
    let images: DriveFile[] = [];

    setNodeLoading(parent, true);

    const driveFileStore = useDriveFileStore();

    try {
      ({ files: images } = await driveFileStore.getFiles(ids));
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

    await loadChildren(parent);

    setNodeLoading(parent, false);
  };

  const importImages = async (
    kind: AssetPropertiesKind,
    parentNode: DriveTreeNode,
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
            result.action === google.picker.Action.PICKED
            && result.docs.length > 0
          ) {
            const ids = result.docs.map(d => d.id);

            void quickCreateAssets(kind, ids, parentNode);
          }
        },
      });
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }
  };

  const moveNode = async (
    node: DriveTreeNode,
    oldParent: DriveTreeNode,
    newParent: DriveTreeNode,
  ) => {
    try {
      setNodeLoading(node, true);

      await moveFile(node.id, oldParent.id, newParent.id);

      // Update store data in-place so it stays consistent with the tree's visual state.
      // Calling loadChildren would create new node objects and orphan existing stats.
      if (oldParent.children) {
        oldParent.children = oldParent.children.filter(c => c.id !== node.id);
      }
      if (newParent.loaded) {
        const nextChildren = newParent.children ?? [];
        if (!nextChildren.some(child => child.id === node.id)) {
          newParent.children = [...nextChildren, node];
        }
      }
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
      console.error(e);
    } finally {
      setNodeLoading(node, false);
    }
  };

  return {
    nodes,
    rootNode,
    isRootFolder,
    setRootFolder,
    setRootToParent,
    loadChildren,
    createChild,
    removeFile,
    moveNode,
    setNodeLoading,
    setNodeLabel,
    importImages,
    showSearchModal: driveSearchStore.showSearchModal,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
