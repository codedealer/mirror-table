import { acceptHMRUpdate, defineStore } from 'pinia';
import type { ModalWindow } from '~/models/types';

export const useWindowStore = defineStore('window', () => {
  const _recentlyOpenedWindows = ref<ModalWindow[]>([]);
  const _pinnedWindows = ref<ModalWindow[]>([]);
  const maxRecentlyOpenedWindows = ref<number>(Number.POSITIVE_INFINITY);

  const windows = computed(() => {
    return [..._pinnedWindows.value, ..._recentlyOpenedWindows.value];
  });

  const add = (window: ModalWindow) => {
    if (_recentlyOpenedWindows.value.length < maxRecentlyOpenedWindows.value) {
      _recentlyOpenedWindows.value.push(window);
    } else {
      const deleteCount = _recentlyOpenedWindows.value.length - maxRecentlyOpenedWindows.value + 1;
      _recentlyOpenedWindows.value.splice(0, deleteCount);
      _recentlyOpenedWindows.value.push(window);
    }
  };

  const remove = (window: ModalWindow) => {
    const index = _recentlyOpenedWindows.value.findIndex(w => w.id === window.id);
    if (index !== -1) {
      _recentlyOpenedWindows.value.splice(index, 1);
    }
  };

  return {
    windows,
    maxRecentlyOpenedWindows,
    add,
    remove,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useWindowStore, import.meta.hot),
  );
}
