import type { SceneElementCanvasObjectAsset } from '~/models/types';

export const useCanvasAssetProperties = (element: Ref<SceneElementCanvasObjectAsset>) => {
  const canvasElementsStore = useCanvasElementsStore();
  const { assetPropertiesRegistry } = storeToRefs(canvasElementsStore);

  const resolvedAssetProperties = computed(() => {
    if (element.value.asset.kind === AssetPropertiesKinds.COMPLEX) {
      return assetPropertiesRegistry.value[element.value.asset.id] || element.value.asset;
    }
    return element.value.asset;
  });

  const hasValidPreviewId = computed(() => {
    if (element.value.asset.kind === AssetPropertiesKinds.COMPLEX) {
      return !!assetPropertiesRegistry.value[element.value.asset.id]?.preview?.id;
    }
    return true;
  });

  return { properties: resolvedAssetProperties, hasValidPreviewId };
};
