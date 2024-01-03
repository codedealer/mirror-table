import type { ComputedRef } from 'vue';
import { TableModes, isSceneElementCanvasObject } from '~/models/types';
import type {
  CanvasElementState, ElementContainerConfig,
  SceneElementCanvasObject,
  SceneElementScreen,
} from '~/models/types';

export const useCanvasElementsStore = defineStore('canvas-elements', () => {
  const sceneStore = useSceneStore();

  const screenElements: ComputedRef<SceneElementScreen[]> = computed(() => {
    if (!sceneStore.sceneElements) {
      return [];
    }

    return sceneStore.sceneElements.filter(isSceneElementScreen);
  });

  const canvasElements: ComputedRef<SceneElementCanvasObject[]> = computed(() => {
    if (!sceneStore.sceneElements) {
      return [];
    }

    return sceneStore.sceneElements.filter(isSceneElementCanvasObject);
  });

  const canvasElementsStateRegistry = ref<Record<string, CanvasElementState>>({});

  const selectedElements = computed(() => {
    return canvasElements.value.filter((element) => {
      return element.id in canvasElementsStateRegistry.value &&
        canvasElementsStateRegistry.value[element.id].selected &&
        canvasElementsStateRegistry.value[element.id].selectable;
    });
  });

  const updateElementState = <T extends CanvasElementState>(elementId: string, state: Partial<T>) => {
    if (!(elementId in canvasElementsStateRegistry.value)) {
      console.warn(`Canvas element state not found for asset: ${elementId}`);
      return;
    }

    canvasElementsStateRegistry.value[elementId] = {
      ...canvasElementsStateRegistry.value[elementId],
      ...state,
    };
  };

  const deselectAll = () => {
    canvasElements.value.forEach((element) => {
      updateElementState(element.id, {
        selected: false,
      });
    });
  };

  const selectElement = (elementId: string) => {
    canvasElements.value.forEach((element) => {
      if (
        !(element.id in canvasElementsStateRegistry.value) ||
        !canvasElementsStateRegistry.value[element.id].selectable
      ) {
        return;
      }

      updateElementState(element.id, {
        selected: element.id === elementId,
      });
    });
  };

  const deleteState = (elementId: string) => {
    delete canvasElementsStateRegistry.value[elementId];
  };

  const applyContainerTransforms = (
    elementId: string,
    transforms: Partial<ElementContainerConfig>,
  ) => {
    const element = canvasElements.value.find(element => element.id === elementId);
    if (!element) {
      return;
    }

    void sceneStore.updateElement<SceneElementCanvasObject>(elementId, {
      container: transforms,
    });
  };

  const tableStore = useTableStore();
  const layersStore = useLayersStore();

  const { activeGroups } = storeToRefs(layersStore);

  watch([toRef(() => tableStore.mode), activeGroups], () => {
    Object.values(canvasElementsStateRegistry.value).forEach((state) => {
      const element = canvasElements.value.find(element => element.id === state.id);
      if (!element) {
        return;
      }

      state.selectable = tableStore.mode === TableModes.OWN && layersStore.activeGroups[element.selectionGroup] === true;
    });
  }, {
    immediate: true,
    deep: true,
  });

  return {
    screenElements,
    canvasElements,
    canvasElementsStateRegistry,
    selectedElements,
    updateElementState,
    selectElement,
    deselectAll,
    deleteState,
    applyContainerTransforms,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasElementsStore, import.meta.hot));
}
