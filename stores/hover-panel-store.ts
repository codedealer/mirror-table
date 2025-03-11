import { acceptHMRUpdate } from 'pinia';
import type { HoverPanelMode } from '~/models/types';
import { HoverPanelContentTypes, HoverPanelModes } from '~/models/types';

export const useHoverPanelStore = defineStore('hover-panel', () => {
  const tableStore = useTableStore();
  const isInteractive = ref(true);
  const _disabled = ref(false);
  const manualRequests = ref(new Set<string>());

  const mode = computed<HoverPanelMode>(() => {
    return manualRequests.value.size > 0 ? HoverPanelModes.MANUAL : HoverPanelModes.AUTO;
  });

  const content = computed(() => {
    return tableStore.mode === TableModes.PRESENTATION
      ? HoverPanelContentTypes.PRESENTATION_CONTROL
      : HoverPanelContentTypes.SESSION_CONTROL;
  });

  const disabled = computed(() => {
    if (!tableStore.mode) {
      return true;
    }

    if (
      tableStore.mode !== TableModes.OWN &&
      tableStore.mode !== TableModes.PRESENTATION
    ) {
      return true;
    }

    return _disabled.value;
  });

  // Children call this with their own unique identifier to request manual mode.
  const requestManual = (childId: string) => {
    manualRequests.value.add(childId);
  };

  // When a child dismisses its manual mode, its request is removed.
  // If no manual requests remain, panelState remains false unless hovering.
  const dismissManual = (childId: string) => {
    if (!manualRequests.value.has(childId)) {
      return;
    }

    manualRequests.value.delete(childId);
  };

  // Hide the panel and set it to auto mode.
  const forceAuto = () => {
    manualRequests.value.clear();

    isInteractive.value = false;
    setTimeout(() => {
      isInteractive.value = true;
    }, 1000);
  };

  return {
    isInteractive,
    manualRequests,
    content,
    mode,
    disabled,
    requestManual,
    dismissManual,
    forceAuto,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useHoverPanelStore, import.meta.hot),
  );
}
