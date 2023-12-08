import type { AssetProperties, AssetPropertiesKind, SelectOption } from '~/models/types';
import { AppPropertiesTypes } from '~/models/types';

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

  let previewObject: Record<string, unknown> = {};
  if (Object.hasOwn(obj, 'preview') && obj.preview) {
    try {
      previewObject = JSON.parse(obj.preview) as unknown as Record<string, unknown>;
    } catch (e) {
      console.error(e);
    }
  }

  return {
    type: AppPropertiesTypes.ASSET,
    kind: obj.kind as AssetPropertiesKind,
    title: obj.title ?? '',
    showTitle: !!obj.showTitle,
    preview: previewObject,
  };
};

export const plainObjFromAssetProperties = (assetProperties: AssetProperties): Record<string, string> => {
  return {
    type: AppPropertiesTypes.ASSET,
    kind: assetProperties.kind,
    title: assetProperties.title,
    showTitle: assetProperties.showTitle ? 'true' : '',
    preview: JSON.stringify(assetProperties.preview),
  };
};
