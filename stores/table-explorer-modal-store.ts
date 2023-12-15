import { acceptHMRUpdate } from 'pinia';
import type { TreeNode } from '~/models/types';

export const useTableExplorerModalStore = defineStore('table-explorer-modal', () => {
  const modalState = ref(false);
  const loading = ref(false);
  const formTitle = ref('');
  const title = ref('');
  const docId = ref<string>();
  const parent = ref<TreeNode>();
  const path = ref<number[]>();
  const modalType = ref<'scene' | 'category'>('scene');

  const cancel = () => {
    formTitle.value = '';
    title.value = '';
    parent.value = undefined;
    loading.value = false;
    docId.value = undefined;
    path.value = undefined;
  };

  const show = (
    type: 'scene' | 'category',
    header: string,
    parentNode: TreeNode,
    name?: string,
    id?: string,
    parentPath?: number[],
  ) => {
    cancel();

    modalType.value = type;
    formTitle.value = header;
    parent.value = parentNode;

    if (name) {
      title.value = name;
    }

    if (id) {
      docId.value = id;
    }

    if (parentPath) {
      path.value = parentPath;
    }

    modalState.value = true;
  };

  const hide = () => {
    cancel();
    modalState.value = false;
  };

  const submit = async () => {
    if (!parent.value) {
      return;
    }
    loading.value = true;

    const tableExplorerStore = useTableExplorerStore();

    if (modalType.value === 'scene') {
      await tableExplorerStore.saveScene(
        title.value,
        parent.value,
        docId.value,
        path.value,
      );
    } else {
      await tableExplorerStore.saveCategory(title.value, parent.value, docId.value);
    }

    loading.value = false;

    hide();
  };

  return {
    modalState,
    loading,
    formTitle,
    title,
    docId,
    parent,
    cancel,
    show,
    hide,
    submit,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTableExplorerModalStore, import.meta.hot),
  );
}
