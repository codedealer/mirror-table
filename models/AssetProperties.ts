import type { AssetProperties, AssetPropertiesKind, SelectOption } from '~/models/types';
import { AppPropertiesTypes } from '~/models/types';
import { PreviewPropertiesFactory, serializePreviewProperties } from '~/models/PreviewProprerties';

export const generateSelectOptions = (): SelectOption[] => {
  return [
    {
      text: 'Simple file',
      value: 'text',
    },
    {
      text: 'Image',
      value: 'image',
    },
    {
      text: 'Rich text with preview',
      value: 'complex',
    },
  ];
};

export const AssetPropertiesFactory = (obj: Record<string, string>): AssetProperties => {
  if (
    !Object.hasOwn(obj, 'type') ||
    obj.type !== 'asset' ||
    !Object.hasOwn(obj, 'kind')
  ) {
    throw new Error('Invalid object');
  }

  const assetProperties: AssetProperties = {
    type: AppPropertiesTypes.ASSET,
    kind: obj.kind as AssetPropertiesKind,
    title: obj.title ?? '',
    showTitle: !!obj.showTitle,
  };

  if (obj.preview) {
    assetProperties.preview = PreviewPropertiesFactory(obj.preview);
  }

  return assetProperties;
};

export const plainObjFromAssetProperties = (assetProperties: AssetProperties): Record<string, string | null> => {
  return {
    type: AppPropertiesTypes.ASSET,
    kind: assetProperties.kind,
    title: assetProperties.title,
    showTitle: assetProperties.showTitle ? 'true' : '',
    preview: serializePreviewProperties(assetProperties.preview),
  };
};
