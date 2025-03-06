import type { DriveFile } from '~/models/types';

type SearchMode = 'all' | 'assets' | 'widgets';
export const useDriveSearchStore = defineStore('drive-search', () => {
  const searchModalState = ref(false);
  const searchModalMode = ref<SearchMode>('all');
  const recentSelected = ref<DriveFile[]>([]);

  const showSearchModal = (mode: SearchMode = 'all') => {
    searchModalMode.value = mode;
    searchModalState.value = true;
  };

  const recentSelectedLimit = 10;
  const addRecentSelected = (file: DriveFile) => {
    const index = recentSelected.value.findIndex(item => item.id === file.id);
    if (index !== -1) {
      recentSelected.value.splice(index, 1);
    }
    recentSelected.value.unshift(file);
    if (recentSelected.value.length > recentSelectedLimit) {
      recentSelected.value.splice(recentSelectedLimit);
    }
  };

  return {
    searchModalState,
    searchModalMode,
    recentSelected,
    showSearchModal,
    addRecentSelected,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveSearchStore, import.meta.hot));
}
