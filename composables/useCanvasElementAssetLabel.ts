import type { SceneElementCanvasObjectAsset } from '~/models/types';

export const useCanvasElementAssetLabel = (
  canvasAsset: Ref<SceneElementCanvasObjectAsset>,
  assetLabel: Ref<string>,
) => {
  const label = computed(() => {
    if (canvasAsset.value.asset.kind === AssetPropertiesKinds.COMPLEX) {
      return assetLabel.value;
    }

    return canvasAsset.value.asset.showTitle ? canvasAsset.value.asset.title : assetLabel.value;
  });

  return label;
};
