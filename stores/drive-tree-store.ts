import { acceptHMRUpdate, defineStore } from 'pinia';
import type { DriveTreeNode } from '~/models/types';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { buildNodes, listFiles } from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export const useDriveTreeStore = defineStore('drive-tree', () => {
  const _nodes = ref<DriveTreeNode[]>([]);
  const rootNode = ref<DriveTreeNode>();

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

  // can be eschewed in favor of rootNode properties
  const loading = ref(false);
  const initialized = ref(false);

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
      loading.value = true;

      await driveWorkspaceSentinel();

      if (newRootNode === undefined) {
        rootNode.value = {
          id: profile.value.settings.driveFolderId,
          label: 'root',
          isFolder: true,
          loaded: true,
          loading: false,
          disabled: false,
          $folded: false,
        };
      } else {
        rootNode.value = structuredClone(toRaw(newRootNode));
      }

      _nodes.value = buildNodes(await listFiles(rootNode.value.id));

      success = true;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      loading.value = false;
    }

    return success;
  };

  watch([profile, isReady], async ([profile, isReady]) => {
    if (initialized.value || !isReady || !profile || loading.value) {
      return;
    }

    loading.value = true;

    await setRootFolder();

    loading.value = false;
    initialized.value = true;
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

  const createChild = async (name: string, parent: DriveTreeNode) => {
    let success = false;

    try {
      parent.loading = true;

      await createFolder(name, parent.id);

      success = true;
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      parent.loading = false;
    }

    return success;
  };

  return {
    nodes,
    rootNode,
    initialized,
    loading,
    isRootFolder,
    setRootFolder,
    loadChildren,
    createChild,
    getNodeByPath,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
