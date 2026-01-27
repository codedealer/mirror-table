import type { DriveFile } from '~/models/types';

type SearchMode = 'all' | 'assets' | 'widgets';
export const useDriveSearchStore = defineStore('drive-search', () => {
  const searchModalState = ref(false);
  const searchModalMode = ref<SearchMode>('all');
  const recentSelected = ref<DriveFile[]>([]);

  // Promise-based selection hooks (for programmatic selection)
  let searchModalResolveHook: ((file: DriveFile) => void) | null = null;
  let searchModalRejectHook: ((error: unknown) => void) | null = null;
  const isPendingSelection = ref(false);

  const showSearchModal = (mode: SearchMode = 'all') => {
    searchModalMode.value = mode;
    searchModalState.value = true;
  };

  /**
   * Opens the search modal and returns a promise that resolves when a file is selected.
   * Similar to scene search's promptToSearch pattern.
   */
  const promptToSearch = (mode: SearchMode = 'assets') => {
    searchModalMode.value = mode;
    searchModalState.value = true;
    isPendingSelection.value = true;

    return new Promise<DriveFile>((resolve, reject) => {
      searchModalResolveHook = resolve;
      searchModalRejectHook = reject;
    });
  };

  const resolve = (file: DriveFile) => {
    if (searchModalResolveHook) {
      searchModalResolveHook(file);
      searchModalResolveHook = null;
      searchModalRejectHook = null;
      isPendingSelection.value = false;
    }
  };

  const reject = (error?: unknown) => {
    if (searchModalRejectHook) {
      searchModalRejectHook(error ?? new Error('Search cancelled'));
      searchModalResolveHook = null;
      searchModalRejectHook = null;
      isPendingSelection.value = false;
    }
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
    isPendingSelection,
    showSearchModal,
    promptToSearch,
    resolve,
    reject,
    addRecentSelected,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveSearchStore, import.meta.hot));
}
