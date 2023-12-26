import type { ComputedRef } from 'vue';
import type {
  CanvasElementState,
  SceneElementCanvasObject,
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

  const canvasElementsStateRegistry = ref<Record<string, CanvasElementState>>({});

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

  return {
    canvasElements,
    canvasElementsStateRegistry,
    updateElementState,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasElementsStore, import.meta.hot));
}
