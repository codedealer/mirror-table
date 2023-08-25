import { acceptHMRUpdate, defineStore } from 'pinia';
import type { DriveTreeNode } from '~/models/types';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';
import { buildNodes, listFiles } from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export const useDriveTreeStore = defineStore('drive-tree', () => {
  const _nodes = ref<DriveTreeNode[]>([]);

  const nodes = computed(() => _nodes.value);

  const loading = ref(false);
  const initialized = ref(false);
  const error = shallowRef<unknown>(null);

  const driveStore = useDriveStore();
  const userStore = useUserStore();

  const { isReady } = toRefs(driveStore);
  const { profile } = toRefs(userStore);

  watch([profile, isReady], async ([profile, isReady]) => {
    if (initialized.value || !isReady || !profile || loading.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      await driveWorkspaceSentinel();

      const folderToSearch = profile.settings.driveFolderId;

      _nodes.value = buildNodes(await listFiles(folderToSearch));
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }, { immediate: true });

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
    initialized,
    loading,
    error,
    loadChildren,
    createChild,
    getNodeByPath,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeStore, import.meta.hot));
}
