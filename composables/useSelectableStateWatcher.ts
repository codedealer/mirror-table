import type { CanvasElementState, SceneElementCanvasObject } from '~/models/types';

export const useSelectableStateWatcher = (
  element: Ref<SceneElementCanvasObject>,
  state: Ref<CanvasElementState | undefined>,
  updateFn: (payload: Partial<CanvasElementState>) => void,
) => {
  const tableStore = useTableStore();
  const layersStore = useLayersStore();
  const { hideHiddenElements, activeGroups } = storeToRefs(layersStore);
  const { mode } = storeToRefs(tableStore);

  const stopWatcher = watch([
    () => element.value.selectionGroup,
    hideHiddenElements,
    mode,
    activeGroups,
  ], (
    [selectionGroup, hide, mode, activeGroupsVal],
  ) => {
    if (!state.value) {
      return;
    }
    if (mode !== TableModes.OWN) {
      updateFn({
        selectable: false,
        selected: false,
      });

      return;
    }

    const isActiveGroup = activeGroupsVal[selectionGroup] === true;
    const selectable = hide ? (isActiveGroup && element.value.enabled) : isActiveGroup;
    const payload: Partial<CanvasElementState> = {
      selectable,
    };
    if (!selectable) {
      payload.selected = false;
    }
    updateFn(payload);
  }, { deep: true, immediate: true });

  onBeforeUnmount(stopWatcher);

  return { stopWatcher };
};
