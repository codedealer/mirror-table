import { acceptHMRUpdate } from 'pinia';
import type { HoverPanelMode } from '~/models/types';
import { HoverPanelContentTypes, HoverPanelModes } from '~/models/types';

export const useHoverPanelStore = defineStore('hover-panel', () => {
  const tableStore = useTableStore();
  const panelState = ref(false);
  const _disabled = ref(false);
  const mode = ref<HoverPanelMode>(HoverPanelModes.AUTO);

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

  const show = (forceManual = false) => {
    if (forceManual) {
      mode.value = HoverPanelModes.MANUAL;
    }

    panelState.value = true;
  };

  const hide = (forceAuto = false) => {
    panelState.value = false;

    if (forceAuto) {
      setTimeout(() => {
        mode.value = HoverPanelModes.AUTO;
      }, 5000);
    }
  };

  return {
    panelState,
    content,
    mode,
    disabled,
    show,
    hide,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useHoverPanelStore, import.meta.hot),
  );
}
