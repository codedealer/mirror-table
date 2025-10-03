import type {
  AssetProperties,
  DriveAsset,
  ElementContainerConfig,
  SceneElementCanvasObjectAsset,
  SceneElementCanvasObjectAssetProperties,
} from '~/models/types';
import type { IdPlaceholder, WithIdPlaceholders } from '~/utils/replaceIdPlaceholder';

export const SceneElementCanvasObjectAssetPropertiesFactory = (
  id: string,
  properties: AssetProperties,
  searchIndex?: string[],
  settings?: Record<string, unknown>,
): SceneElementCanvasObjectAssetProperties => {
  if (!properties.kind) {
    throw new Error('Invalid object');
  }
  if (!id) {
    throw new Error('Missing id');
  }

  const assetProperties: SceneElementCanvasObjectAssetProperties = {
    id,
    type: 'asset',
    kind: properties.kind,
    title: properties.title,
    showTitle: properties.showTitle,
    preview: {
      id: properties.preview?.id ?? '',
      nativeWidth: properties.preview?.nativeWidth ?? 0,
      nativeHeight: properties.preview?.nativeHeight ?? 0,
      rotation: properties.preview?.rotation ?? 0,
      scaleX: properties.preview?.scaleX ?? 1,
      scaleY: properties.preview?.scaleY ?? 1,
    },
  };

  if (!assetProperties.title) {
    assetProperties.showTitle = false;
  }

  if (searchIndex) {
    assetProperties.searchIndex = searchIndex;
  }
  if (settings) {
    assetProperties.settings = settings;
  }

  return assetProperties;
};

export const SceneElementCanvasObjectAssetFactory = (
  id: string | IdPlaceholder,
  asset: DriveAsset,
  ownerId: string,
  fittingFunction?: (container: WithIdPlaceholders<ElementContainerConfig>) => WithIdPlaceholders<ElementContainerConfig>,
) => {
  if (!asset.appProperties.preview) {
    throw new Error('Asset without preview cannot be added to the scene.');
  }

  const element: WithIdPlaceholders<SceneElementCanvasObjectAsset> = {
    _type: 'canvas-object',
    id,
    type: 'asset',
    asset: SceneElementCanvasObjectAssetPropertiesFactory(asset.id, asset.appProperties),
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
    owner: ownerId,
  };

  if (fittingFunction) {
    element.container = fittingFunction(element.container);
  }

  return element;
};
