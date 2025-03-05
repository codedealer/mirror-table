type SearchMode = 'all' | 'assets' | 'widgets';
export const useDriveSearchStore = defineStore('drive-search', () => {
  const searchModalState = ref(false);
  const searchModalMode = ref<SearchMode>('all');

  const showSearchModal = (mode: SearchMode = 'all') => {
    searchModalMode.value = mode;
    searchModalState.value = true;
  };

  return {
    searchModalState,
    searchModalMode,
    showSearchModal,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveSearchStore, import.meta.hot));
}
