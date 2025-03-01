import type { SceneElementCanvasObjectAsset } from '~/models/types';
import { useCanvasAssetProperties } from '~/composables/useCanvasAssetProperties';

export const useCanvasElementAssetLabel = (
  canvasAsset: Ref<SceneElementCanvasObjectAsset>,
) => {
  const { properties } = useCanvasAssetProperties(canvasAsset);
  const label = computed(() => {
    return properties.value.title;
  });

  const isVisible = computed(() => {
    return properties.value.showTitle && properties.value.title.length > 0;
  });

  return { label, isVisible };
};
