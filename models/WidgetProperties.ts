import type { SelectOption, WidgetProperties, WidgetTemplate } from '~/models/types';
import { WidgetTemplates } from '~/models/types';

export const generateTemplates = (): SelectOption[] => {
  return [
    {
      text: 'Markdown',
      value: WidgetTemplates.MARKDOWN,
      description: 'Simple markdown text',
    },
    {
      text: 'Candela Obscura: Player',
      value: WidgetTemplates.CANDELA_PLAYER,
      description: 'Embed a Candela Obscura player card',
    },
  ];
};

export const WidgetPropertiesFactory = (obj: Record<string, string>): WidgetProperties => {
  if (
    !Object.hasOwn(obj, 'type') ||
    obj.type !== 'widget' ||
    !Object.hasOwn(obj, 'template')
  ) {
    throw new Error('Invalid object');
  }

  const widgetProperties: WidgetProperties = {
    type: 'widget',
    template: obj.template as WidgetTemplate,
  };

  if (obj.firestoreId) {
    // technically we need to check that it exists
    widgetProperties.firestoreId = obj.firestoreId;
  }

  if (obj.title) {
    widgetProperties.title = obj.title;
  }

  return widgetProperties;
};

export const plainObjFromWidgetProperties = (widgetProperties: WidgetProperties): Record<string, string | null> => {
  return {
    type: 'widget',
    template: widgetProperties.template,
    firestoreId: widgetProperties.firestoreId ?? null,
    title: widgetProperties.title ?? null,
  };
};
