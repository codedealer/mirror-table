import type { SceneElementCanvasObjectAsset } from '~/models/types';

export const useCanvasElementAssetLabel = (
  canvasAsset: Ref<SceneElementCanvasObjectAsset>,
) => {
  const label = computed(() => {
    return canvasAsset.value.asset.title;
  });

  const isVisible = computed(() => {
    return canvasAsset.value.asset.showTitle && canvasAsset.value.asset.title.length > 0;
  });

  return { label, isVisible };
};
