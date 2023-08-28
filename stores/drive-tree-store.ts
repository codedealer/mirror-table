import { acceptHMRUpdate, defineStore } from 'pinia';
import type { DriveTreeNode } from '~/models/types';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { buildNodes, listFiles, uploadFile } from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export const useDriveTreeStore = defineStore('drive-tree', () => {
  const _nodes = ref<DriveTreeNode[]>([]);
  const rootNode = ref<DriveTreeNode>({
    id: '',
    label: '',
    isFolder: true,
    loaded: false,
    loading: false,
    disabled: false,
    $folded: false,
  } as DriveTreeNode);

  /**
   * Get a node by its path:
   * path represents an array of indexes in a multidimensional array _nodes
   * @param path
   */
  const getNodeByPath = (path: string[]) => {
    let node: DriveTreeNode | undefined;

    for (const index of path) {
      if (!node) {
        node = _nodes.value[Number.parseInt(index)];
      } else {
        if (!Array.isArray(node.children)) {
          return;
        }
        node = node.children[Number.parseInt(index)];
      }
    }

    return node;
  };

  const nodes = computed(() => {
    return _nodes.value;
  });

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

      _nodes.value = buildNodes(await listFiles(rootNode.value.id));

      rootNode.value.loaded = true;

      success = true;
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

  const loadChildren = async (node: DriveTreeNode) => {
    let success = false;

    try {
      node.loading = true;

      node.children = buildNodes(await listFiles(node.id));

      node.loaded = true;
      success = true;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      if (node) {
        node.loading = false;
      }
    }

    return success;
  };

  const createChild = async (nameOrFile: string | File, parent: DriveTreeNode) => {
    let success = false;

    try {
      parent.loading = true;

      if (typeof nameOrFile === 'string') {
        await createFolder(nameOrFile, parent.id);
      } else {
        await uploadFile(nameOrFile, parent.id);
      }

      // update and unfold the parent folder
      parent.children = buildNodes(await listFiles(parent.id));
      parent.$folded = false;

      success = true;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      parent.loading = false;
    }

    return success;
  };

  const removeFile = async (node: DriveTreeNode, restore = false) => {
    let success = false;

    try {
      node.loading = true;

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
      node.loading = false;
    }

    return success;
  };

  return {
    nodes,
    rootNode,
    isRootFolder,
    setRootFolder,
    loadChildren,
    createChild,
    getNodeByPath,
    removeFile,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
