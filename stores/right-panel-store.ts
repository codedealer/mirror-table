export const useRightPanelStore = defineStore('right-panel', () => {
  const sideBarMinimized = ref(false);

  return {
    sideBarMinimized,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRightPanelStore, import.meta.hot));
}
