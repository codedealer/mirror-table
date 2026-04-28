export const useRightPanelStore = defineStore('right-panel', () => {
  const sideBarMinimized = ref(false);
  const isSettingsModalVisible = ref(false);

  return {
    sideBarMinimized,
    isSettingsModalVisible,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRightPanelStore, import.meta.hot));
}
