import { acceptHMRUpdate, defineStore } from 'pinia';
import type { DriveTreeNode } from '~/models/types';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { buildNodes, listFiles, uploadFile } from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

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

  /**
   * Get a node by its path:
   * path represents an array of indexes in a multidimensional array _nodes
   * @param path
   */
  const getNodeByPath = (path: string[]) => {
    let node: DriveTreeNode | undefined;

    for (const index of path) {
      if (!node) {
        node = nodes.value[Number.parseInt(index)];
      } else {
        if (!Array.isArray(node.children)) {
          return;
        }
        node = node.children[Number.parseInt(index)];
      }
    }

    return node;
  };

  const driveStore = useDriveStore();
  const userStore = useUserStore();

  const { isReady } = toRefs(driveStore);
  const { profile } = toRefs(userStore);

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

      node.children = buildNodes(await listFiles(node.id));

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
    if (!rootNode.value || !rootNode.value.data || !rootNode.value.data.parents) {
      return false;
    }

    const parentId = rootNode.value.data.parents[0];

    if (!parentId) {
      return false;
    }

    let parentNode: DriveTreeNode;
    try {
      rootNode.value.loading = true;

      const parentFile = await getFile(parentId);

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

  const toggleFold = async (node: DriveTreeNode, path: string[]) => {
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
    parentPath: string[] = [],
  ) => {
    let success = false;

    try {
      setNodeLoading(parent, true);

      if (typeof nameOrFile === 'string') {
        await createFolder(nameOrFile, parent.id);
      } else {
        await uploadFile(nameOrFile, parent.id);
      }

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
    let success = false;

    try {
      setNodeLoading(node, true);

      await deleteFile(node.id, restore);

      if (node.data) {
        node.data.trashed = !restore;
      }

      if (node.isFolder && !restore) {
        node.$folded = true;
      }

      node.disabled = !restore;

      success = true;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      setNodeLoading(node, false);
    }

    return success;
  };

  return {
    nodes,
    rootNode,
    isRootFolder,
    setRootFolder,
    setRootToParent,
    loadChildren,
    toggleFold,
    createChild,
    getNodeByPath,
    removeFile,
    setNodeLoading,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
