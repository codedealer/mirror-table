import { TableModes } from '~/models/types';

export const useLayoutStore = defineStore('layout', () => {
  const tableStore = useTableStore();

  const toolbarEnabled = computed(() => {
    return tableStore.permissions.isOwner && tableStore.mode === TableModes.OWN;
  });

  const rightPanelEnabled = computed(() => {
    return tableStore.permissions.isEditor && tableStore.mode !== TableModes.PRESENTATION;
  });

  return {
    toolbarEnabled,
    rightPanelEnabled,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useLayoutStore, import.meta.hot),
  );
}
