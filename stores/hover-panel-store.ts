import { acceptHMRUpdate } from 'pinia';
import type { HoverPanelMode } from '~/models/types';
import { HoverPanelContentTypes, HoverPanelModes } from '~/models/types';

export const useHoverPanelStore = defineStore('hoverPanel', () => {
  const tableStore = useTableStore();
  const panelState = ref(false);
  const _disabled = ref(false);
  const mode = ref<HoverPanelMode>(HoverPanelModes.AUTO);

  const content = computed(() => {
    return HoverPanelContentTypes.SESSION_CONTROL;
  });

  const disabled = computed(() => {
    if (!tableStore.mode) {
      return true;
    }

    if (tableStore.mode === TableModes.VIEW) {
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
