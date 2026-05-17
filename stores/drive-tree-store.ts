import type {
  AppProperties,
  AssetPropertiesKind,
  DriveFile,
  DriveTreeNode,
} from '~/models/types';
import { acceptHMRUpdate, defineStore } from 'pinia';

import { buildNodes, moveFile } from '~/utils/driveOps';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const createVisibleRootNode = (id = '') => {
  return {
    id,
    label: '',
    isFolder: true,
    loaded: false,
    loading: false,
    disabled: false,
  } as DriveTreeNode;
};

const reconcileNodes = (
  existingChildren: DriveTreeNode[] | undefined,
  nextChildren: DriveTreeNode[],
) => {
  const existingById = new Map((existingChildren ?? []).map(child => [child.id, child]));

  return nextChildren.map((nextChild) => {
    const existingChild = existingById.get(nextChild.id);

    if (!existingChild || existingChild.isFolder !== nextChild.isFolder) {
      return nextChild;
    }

    existingChild.label = nextChild.label;
    existingChild.icon = nextChild.icon;
    existingChild.disabled = nextChild.disabled;

    if (!existingChild.isFolder) {
      existingChild.loaded = nextChild.loaded;
    }

    return existingChild;
  });
};

export const useDriveTreeStore = defineStore('drive-tree', () => {
  const visibleRootNode = ref<DriveTreeNode>(createVisibleRootNode());
  const openFolderIds = ref(new Set<string>());

  const nodes = computed(() => {
    return visibleRootNode.value.children ?? [];
  });

  const driveStore = useDriveStore();
  const userStore = useUserStore();
  const driveSearchStore = useDriveSearchStore();

  const { isReady } = storeToRefs(driveStore);
  const { profile } = storeToRefs(userStore);

  const canonicalRootId = computed(() => {
    return profile.value?.settings.driveFolderId ?? '';
  });

  const isCanonicalRootVisible = computed(() => {
    if (!profile.value) {
      // passthrough until initialized
      return true;
    }

    return visibleRootNode.value.id === canonicalRootId.value;
  });

  const setNodeLoading = (node: DriveTreeNode, loading: boolean) => {
    node.loading = loading;
    if (node.children) {
      node.children.forEach(child => setNodeLoading(child, loading));
    }
  };

  const setFolderOpen = (folderId: string, open: boolean) => {
    const nextOpenFolderIds = new Set(openFolderIds.value);

    if (open) {
      nextOpenFolderIds.add(folderId);
    } else {
      nextOpenFolderIds.delete(folderId);
    }

    openFolderIds.value = nextOpenFolderIds;
  };

  const loadChildren = async (node: DriveTreeNode) => {
    let success = false;

    try {
      setNodeLoading(node, true);

      const driveFileStore = useDriveFileStore();
      const nextChildren = buildNodes(await driveFileStore.listFilesInFolder(node.id));

      node.children = reconcileNodes(node.children, nextChildren);

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

  const setVisibleRootFolder = async (newVisibleRootNode?: DriveTreeNode) => {
    let success = false;

    if (!profile.value) {
      throw new Error('Setting visible Drive root when profile is not loaded');
    }

    try {
      visibleRootNode.value = newVisibleRootNode === undefined
        ? createVisibleRootNode(canonicalRootId.value)
        : {
            id: newVisibleRootNode.id,
            label: newVisibleRootNode.label,
            isFolder: newVisibleRootNode.isFolder,
            loaded: false,
            loading: false,
            disabled: newVisibleRootNode.disabled,
            ...(newVisibleRootNode.icon !== undefined && { icon: newVisibleRootNode.icon }),
          };

      visibleRootNode.value.loading = true;

      await driveWorkspaceSentinel();

      success = await loadChildren(visibleRootNode.value);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      visibleRootNode.value.loading = false;
    }

    return success;
  };

  const resetVisibleRootFolder = async () => {
    return await setVisibleRootFolder();
  };

  watch([profile, isReady], async ([profile, isReady]) => {
    if (visibleRootNode.value.loading || visibleRootNode.value.loaded || !isReady || !profile) {
      return;
    }

    await resetVisibleRootFolder();
  }, { immediate: true });

  const setVisibleRootToParent = async () => {
    const driveFileStore = useDriveFileStore();
    if (!visibleRootNode.value.id) {
      return false;
    }

    let rootFile: DriveFile | undefined;
    try {
      ({ file: rootFile } = await driveFileStore.getFile(
        visibleRootNode.value.id,
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
      visibleRootNode.value.loading = true;

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
      visibleRootNode.value.loading = false;
    }

    return await setVisibleRootFolder(parentNode);
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
      if (success) {
        setFolderOpen(parent.id, true);
      }
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

  const importImages = async (
    kind: AssetPropertiesKind,
    parentNode: DriveTreeNode,
  ) => {
    const { importImagesAsAssets } = useTableImportImagesAsScenes();

    await importImagesAsAssets(kind, parentNode);
  };

  const importTextAssets = async (parentNode: DriveTreeNode) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,text/markdown';
    input.multiple = true;
    input.style.display = 'none';

    const cleanup = () => input.remove();

    input.addEventListener('cancel', cleanup);

    input.addEventListener('change', async () => {
      cleanup();

      const selectedFiles = Array.from(input.files ?? []);

      if (!selectedFiles.length) {
        return;
      }

      setNodeLoading(parentNode, true);

      const driveFileStore = useDriveFileStore();
      const notificationStore = useNotificationStore();

      for (const file of selectedFiles) {
        if (!file.name.toLowerCase().endsWith('.md')) {
          notificationStore.error(`Skipped "${file.name}": only .md files are supported`);
          continue;
        }

        const appProperties = AssetPropertiesFactory({
          type: AppPropertiesTypes.ASSET,
          kind: AssetPropertiesKinds.TEXT,
        });

        try {
          await driveFileStore.createFile(file, parentNode.id, appProperties);
        } catch (e) {
          console.error(e);
          notificationStore.error(extractErrorMessage(e));
          break;
        }
      }

      await loadChildren(parentNode);
      setNodeLoading(parentNode, false);
    });

    document.body.appendChild(input);
    input.click();
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
    canonicalRootId,
    visibleRootNode,
    isCanonicalRootVisible,
    setVisibleRootFolder,
    resetVisibleRootFolder,
    setVisibleRootToParent,
    loadChildren,
    createChild,
    removeFile,
    moveNode,
    setNodeLoading,
    setNodeLabel,
    openFolderIds,
    setFolderOpen,
    importImages,
    importTextAssets,
    showSearchModal: driveSearchStore.showSearchModal,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
