import type { DynamicPanelContentType, DynamicPanelModelType } from '~/models/types';

export const useDynamicPanelStore = defineStore('dynamic-panel', () => {
  const models = ref<Record<DynamicPanelModelType, boolean>>({
    [DynamicPanelModelTypes.LEFT]: false,
    [DynamicPanelModelTypes.RIGHT]: false,
  });

  const contents = ref<Record<DynamicPanelModelType, DynamicPanelContentType | null>>({
    [DynamicPanelModelTypes.LEFT]: null,
    [DynamicPanelModelTypes.RIGHT]: null,
  });

  const close = (model: DynamicPanelModelType) => {
    models.value[model] = false;
    contents.value[model] = null;
  };

  const open = (
    model: DynamicPanelModelType,
    content: DynamicPanelContentType,
    keepOpen = false,
  ) => {
    if (models.value[model] && contents.value[model] === content) {
      if (keepOpen) {
        return;
      }

      close(model);
      return;
    }

    models.value[model] = true;
    contents.value[model] = content;
  };

  return {
    models,
    contents,
    open,
    close,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDynamicPanelStore, import.meta.hot));
}
