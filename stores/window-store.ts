import { acceptHMRUpdate, defineStore } from 'pinia';
import type { ModalWindow } from '~/models/types';

export const useWindowStore = defineStore('window', () => {
  const _recentlyOpenedWindows = ref<ModalWindow[]>([]);
  const _pinnedWindows = ref<ModalWindow[]>([]);
  const maxWindows = ref<number>(Number.POSITIVE_INFINITY);
  const maxRecentlyOpenedWindows = computed(() => {
    return maxWindows.value - _pinnedWindows.value.length;
  });

  const lastActiveWindowId = ref<string | null>(null);

  const setLastActiveWindowId = (window: ModalWindow) => {
    lastActiveWindowId.value = window.id;
  };

  const windows = computed(() => {
    return [..._pinnedWindows.value, ..._recentlyOpenedWindows.value];
  });

  const add = (window: ModalWindow) => {
    if (_recentlyOpenedWindows.value.length < maxRecentlyOpenedWindows.value) {
      _recentlyOpenedWindows.value.push(window);
    } else {
      // can't remove active windows
      const removableWindows = _recentlyOpenedWindows.value.filter(w => !w.active);
      let deleteCount = _recentlyOpenedWindows.value.length - maxRecentlyOpenedWindows.value + 1;

      if (deleteCount > removableWindows.length) {
        const notificationStore = useNotificationStore();
        notificationStore.error('Cannot open more windows');

        return;
      }

      const newWindows: ModalWindow[] = [];
      for (let i = 0; i < _recentlyOpenedWindows.value.length; i++) {
        if (deleteCount > 0 && !_recentlyOpenedWindows.value[i].active) {
          deleteCount--;
        } else {
          newWindows.push(_recentlyOpenedWindows.value[i]);
        }
      }

      newWindows.push(window);

      _recentlyOpenedWindows.value = newWindows;
    }

    setLastActiveWindowId(window);
  };

  const remove = (window: ModalWindow) => {
    const index = _recentlyOpenedWindows.value.findIndex(w => w.id === window.id);
    if (index !== -1) {
      _recentlyOpenedWindows.value.splice(index, 1);
    }
  };

  const pin = (window: ModalWindow) => {
    const index = _recentlyOpenedWindows.value.findIndex(w => w.id === window.id);
    if (index !== -1) {
      _recentlyOpenedWindows.value.splice(index, 1);
      _pinnedWindows.value.push(window);
      window.pinned = true;
    }
  };

  const unpin = (window: ModalWindow) => {
    const index = _pinnedWindows.value.findIndex(w => w.id === window.id);
    if (index !== -1) {
      _pinnedWindows.value.splice(index, 1);
      _recentlyOpenedWindows.value.push(window);
      window.pinned = false;
    }
  };

  const toggle = (window: ModalWindow, forceOpen = false) => {
    window.active = forceOpen ||
      (window.id !== lastActiveWindowId.value && window.active) ||
      !window.active;

    if (window.active) {
      setLastActiveWindowId(window);
    }
  };

  const toggleEdit = (window: ModalWindow) => {
    window.content.editing = !window.content.editing;
  };

  const setWindowStatus = (window: ModalWindow, status: typeof ModalWindowStatus[keyof typeof ModalWindowStatus]) => {
    window.status = status;
  };

  const setWindowTitle = (window: ModalWindow, title: string) => {
    window.title = title;
  };

  const toggleOrAdd = (window: ModalWindow, forceOpen = false) => {
    const existingWindow = windows.value.find(w => w.id === window.id);

    if (existingWindow) {
      toggle(existingWindow, forceOpen);
    } else {
      add(window);
    }
  };

  return {
    windows,
    maxWindows,
    maxRecentlyOpenedWindows,
    lastActiveWindowId,
    add,
    remove,
    pin,
    unpin,
    toggle,
    toggleEdit,
    toggleOrAdd,
    setWindowStatus,
    setWindowTitle,
    setLastActiveWindowId,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useWindowStore, import.meta.hot),
  );
}
