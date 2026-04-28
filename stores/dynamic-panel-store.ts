import type { DynamicPanelContentType, DynamicPanelModelType } from '~/models/types';

export const useDynamicPanelStore = defineStore('dynamic-panel', () => {
  const tableStore = useTableStore();
  const userStore = useUserStore();
  const { profile } = storeToRefs(userStore);

  // Track pinned state per content type, default is true (pinned)
  const pinnedStates = ref<Partial<Record<DynamicPanelContentType, boolean>>>({
    [DynamicPanelContentTypes.EXPLORER]: true,
    [DynamicPanelContentTypes.SESSIONS]: true,
    [DynamicPanelContentTypes.LAYERS]: true,
    [DynamicPanelContentTypes.WIDGETS]: true,
  });

  // Sync pinned states from profile; reset to defaults first so user B doesn't inherit user A's state
  watch(profile, (prof) => {
    pinnedStates.value = {
      [DynamicPanelContentTypes.EXPLORER]: true,
      [DynamicPanelContentTypes.SESSIONS]: true,
      [DynamicPanelContentTypes.LAYERS]: true,
      [DynamicPanelContentTypes.WIDGETS]: true,
    };
    if (!prof) {
      return;
    }
    const sidebar = prof.settings.layout?.sidebar;
    if (sidebar) {
      for (const key of Object.keys(DynamicPanelContentTypes) as Array<keyof typeof DynamicPanelContentTypes>) {
        const panelType = DynamicPanelContentTypes[key];
        const saved = sidebar[panelType]?.pinned;
        if (saved !== undefined) {
          pinnedStates.value[panelType] = saved;
        }
      }
    }
  }, { immediate: true });

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

  const toggleTablePanelState = (type: DynamicPanelModelType) => {
    if (!tableStore.table) {
      return;
    }

    tableStore.togglePanelsState({
      [type]: !tableStore.table.panels[type],
    });
  };

  const togglePanelLocal = (type: DynamicPanelModelType) => {
    open(type, DynamicPanelContentTypes.WIDGETS);
  };

  const isPinned = (contentType: DynamicPanelContentType | null) => {
    if (!contentType)
      return true;
    return pinnedStates.value[contentType] ?? true;
  };

  const togglePin = async (contentType: DynamicPanelContentType | null) => {
    if (!contentType)
      return;
    const newPinned = !isPinned(contentType);
    pinnedStates.value[contentType] = newPinned;
    try {
      await userStore.updateLayoutPanelPin(contentType, newPinned);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }
  };

  return {
    models,
    contents,
    pinnedStates,
    open,
    close,
    toggleTablePanelState,
    togglePanelLocal,
    isPinned,
    togglePin,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDynamicPanelStore, import.meta.hot));
}
