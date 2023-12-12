import type { DynamicPanelModelType } from '~/models/types';

export const useDynamicPanelStore = defineStore('dynamic-panel', () => {
  const models = ref<Record<DynamicPanelModelType, boolean>>({
    right: false,
    left: false,
  });
  return {
    models,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDynamicPanelStore, import.meta.hot));
}
