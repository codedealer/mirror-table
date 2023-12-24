import type { ComputedRef } from 'vue';
import { watchArray } from '@vueuse/core';
import type {
  CanvasElementState,
  CanvasElementStateAsset,
  SceneElementCanvasObject,
  Stateful,
} from '~/models/types';
import {
  isSceneElementCanvasObject,
  isSceneElementCanvasObjectAsset,
} from '~/models/types';

export const useCanvasElementsStore = defineStore('canvas-elements', () => {
  const sceneStore = useSceneStore();

  const canvasElements: ComputedRef<SceneElementCanvasObject[]> = computed(() => {
    if (!sceneStore.sceneElements) {
      return [];
    }

    return sceneStore.sceneElements.filter(isSceneElementCanvasObject);
  });

  const canvasStatefulElementsRegistry = ref<
    Record<string, Stateful<SceneElementCanvasObject, CanvasElementState>>
  >({});

  watchArray(canvasElements, (_, __, added, removed) => {
    added.forEach((element) => {
      // assuming all elements are assets for now
      if (!isSceneElementCanvasObjectAsset(element)) {
        return;
      }

      const loadableState: CanvasElementStateAsset = {
        _type: 'asset',
        selectable: true,
        selected: false,
        loading: false,
        loaded: false,
      };

      canvasStatefulElementsRegistry.value[element.id] = {
        ...element,
        _state: loadableState,
      };
    });

    removed.forEach((element) => {
      delete canvasStatefulElementsRegistry.value[element.id];
    });
  });

  const updateElementState = <T extends CanvasElementState>(elementId: string, state: Partial<T>) => {
    const element = canvasStatefulElementsRegistry.value[elementId];

    if (!element) {
      console.warn(`Canvas element state not found for asset: ${elementId}`);
      return;
    }

    element._state = {
      ...element._state,
      ...state,
    };
  };

  return {
    canvasElements,
    canvasStatefulElementsRegistry,
    updateElementState,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasElementsStore, import.meta.hot));
}
