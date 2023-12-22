import type { ComputedRef } from 'vue';
import { watchArray } from '@vueuse/core';
import type {
  CanvasElementState, CanvasElementStateLoadable,
  SceneElementCanvasObject, Stateful,
} from '~/models/types';
import {
  isSceneElementCanvasObject,
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
      const loadableState: CanvasElementStateLoadable = {
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

  const updateElementState = (elementId: string, state: Partial<CanvasElementState>) => {
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
