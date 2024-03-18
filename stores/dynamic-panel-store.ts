import type { DynamicPanelContentType, DynamicPanelModelType } from '~/models/types';

export const useDynamicPanelStore = defineStore('dynamic-panel', () => {
  const tableStore = useTableStore();

  const _models = ref<Record<DynamicPanelModelType, boolean>>({
    [DynamicPanelModelTypes.LEFT]: false,
    [DynamicPanelModelTypes.RIGHT]: false,
  });

  const models = computed(() => {
    if (!tableStore.table || tableStore.mode === TableModes.OWN) {
      // owner has manual control over the panels
      return _models.value;
    }

    // otherwise, the panels are controlled by the table
    return tableStore.table.panels;
  });

  const _contents = ref<Record<DynamicPanelModelType, DynamicPanelContentType | null>>({
    [DynamicPanelModelTypes.LEFT]: null,
    [DynamicPanelModelTypes.RIGHT]: null,
  });

  const contents = computed(() => {
    if (!tableStore.table || tableStore.mode === TableModes.OWN) {
      // owner has manual control over the panels
      return _contents.value;
    }

    // otherwise, the panels show widgets
    return {
      [DynamicPanelModelTypes.LEFT]: tableStore.table.panels[DynamicPanelModelTypes.LEFT]
        ? DynamicPanelContentTypes.WIDGETS
        : null,
      [DynamicPanelModelTypes.RIGHT]: tableStore.table.panels[DynamicPanelModelTypes.RIGHT]
        ? DynamicPanelContentTypes.WIDGETS
        : null,
    };
  });

  const close = (model: DynamicPanelModelType) => {
    models.value[model] = false;
    _contents.value[model] = null;
  };

  const open = (
    model: DynamicPanelModelType,
    content: DynamicPanelContentType,
    keepOpen = false,
  ) => {
    if (models.value[model] && _contents.value[model] === content) {
      if (keepOpen) {
        return;
      }

      close(model);
      return;
    }

    models.value[model] = true;
    _contents.value[model] = content;
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
