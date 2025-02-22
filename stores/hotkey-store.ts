import { defineStore } from 'pinia';
import type { Hotkey, HotkeyGroup } from '~/models/types';

export const useHotkeyStore = defineStore('hotkey', () => {
  const hotkeys = ref<Hotkey[]>([]);
  const isHotkeyModalVisible = ref(false);

  const registerHotkey = (hotkey: Hotkey) => {
    if (hotkeys.value.some(h => h.id === hotkey.id)) {
      console.error(`Hotkey with id ${hotkey.id} already exists`);
      return;
    }

    hotkeys.value.push(hotkey);
  };

  const unregisterHotkey = (id: string) => {
    hotkeys.value = hotkeys.value.filter(h => h.id !== id);
  };

  const groupedHotkeys = computed<HotkeyGroup[]>(() => {
    const groups = new Map<string, Hotkey[]>();

    hotkeys.value.forEach((hotkey) => {
      const namespace = hotkey.namespace || 'General';
      if (!groups.has(namespace)) {
        groups.set(namespace, []);
      }
      groups.get(namespace)?.push(hotkey);
    });

    return Array.from(groups.entries()).map(([namespace, hotkeys]) => ({
      namespace,
      hotkeys,
    }));
  });

  return {
    hotkeys,
    isHotkeyModalVisible,
    groupedHotkeys,
    registerHotkey,
    unregisterHotkey,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useHotkeyStore, import.meta.hot));
}
