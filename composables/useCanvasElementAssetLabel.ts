import type { DriveAsset, SceneElementCanvasObjectAsset } from '~/models/types';

export const useCanvasElementAssetLabel = (
  canvasAsset: Ref<SceneElementCanvasObjectAsset>,
  asset: Ref<DriveAsset | undefined>,
  assetLabel: Ref<string>,
) => {
  const label = computed(() => {
    if (!asset.value) {
      return assetLabel.value;
    }

    if (asset.value.appProperties.kind === AssetPropertiesKinds.COMPLEX) {
      return asset.value.appProperties.showTitle ? asset.value.appProperties.title : assetLabel.value;
    }

    return canvasAsset.value.asset.showTitle ? canvasAsset.value.asset.title : assetLabel.value;
  });

  const isVisible = computed(() => {
    if (asset.value?.appProperties.kind === AssetPropertiesKinds.COMPLEX) {
      return asset.value.appProperties.showTitle;
    }

    return canvasAsset.value.asset.showTitle;
  });

  return { label, isVisible };
};
