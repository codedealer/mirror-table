import type { AssetProperties, AssetPropertiesKind, SelectOption } from '~/models/types';

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

export const AssetPropertiesFactory = (kind: AssetPropertiesKind, title = ''): AssetProperties => {
  return {
    type: 'asset',
    kind,
    title,
    showTitle: '',
    preview: '',
  };
};
