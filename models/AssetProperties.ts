import type { AssetProperties, AssetPropertiesKind, SelectOption } from '~/models/types';
import { AppPropertiesTypes } from '~/models/types';
import { PreviewPropertiesFactory, serializePreviewProperties } from '~/models/PreviewProprerties';

export const generateSelectOptions = (): SelectOption[] => {
  return [
    {
      text: 'Text file',
      value: 'text',
      description: 'Just a markdown file that can displayed as a title screen',
    },
    {
      text: 'Image template',
      value: 'image',
      description: 'Independent image with optional caption. Each new image in a scene behaves like a separate entity and can have its own caption with the original caption only serving as a default value. Think markers on a map: the image for a marker is the same but all the markers are separate entities.',
    },
    {
      text: 'Asset with preview',
      value: 'complex',
      description: 'Markdown file with a preview image. Each asset on a scene is linked to this file. E.g. a change of caption in one scene will change it in all scenes.',
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

  if (!assetProperties.title) {
    assetProperties.showTitle = false;
  }

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
