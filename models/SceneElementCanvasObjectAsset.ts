import type { DriveAsset, ElementContainerConfig, SceneElementCanvasObjectAsset } from '~/models/types';

export const SceneElementCanvasObjectAssetFactory = (
  id: string,
  asset: DriveAsset,
  fittingFunction?: (container: ElementContainerConfig) => ElementContainerConfig,
) => {
  if (!asset.appProperties.preview) {
    throw new Error('Asset without preview cannot be added to the scene.');
  }

  const element: SceneElementCanvasObjectAsset = {
    _type: 'canvas-object',
    id,
    type: 'asset',
    asset: {
      id: asset.id,
      ...asset.appProperties,
      preview: asset.appProperties.preview,
    },
    container: {
      id,
      name: 'element-container' as const,
      x: 0,
      y: 0,
      width: asset.appProperties.preview.nativeWidth,
      height: asset.appProperties.preview.nativeHeight,
      rotation: asset.appProperties.preview.rotation ?? 0,
      scaleX: 1,
      scaleY: 1,
    },
    enabled: false,
    selectionGroup: SelectionGroups.HIDDEN,
    defaultRank: Date.now(),
  };

  if (fittingFunction) {
    element.container = fittingFunction(element.container);
  }

  return element;
};
