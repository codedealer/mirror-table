import type { Category, Scene, TreeNode } from '~/models/types';

export const useExplorerItem =
  <T extends Scene | Category>(
    node: TreeNode,
  ) => {
    const nodeRef = shallowRef(node);
    const idRef = computed(() => nodeRef.value.id);

    const tableExplorerStore = useTableExplorerStore();

    const item = computed<T | undefined>(() => {
      if (!idRef.value) {
        return;
      }

      if (idRef.value in tableExplorerStore.categories) {
        return tableExplorerStore.categories[idRef.value] as T;
      }

      if (idRef.value in tableExplorerStore.scenes) {
        return tableExplorerStore.scenes[idRef.value] as T;
      }
    });

    return {
      item,
    };
  };
