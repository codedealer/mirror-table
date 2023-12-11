import type { PreviewProperties } from '~/models/types';

export const PreviewPropertiesFactory = (
  objOrString: Partial<PreviewProperties> | string,
): PreviewProperties => {
  let obj: Partial<PreviewProperties>;
  if (typeof objOrString === 'string') {
    try {
      obj = JSON.parse(objOrString) as Partial<PreviewProperties>;
    } catch (e) {
      console.error(e);
      throw new Error('Invalid JSON object');
    }
  } else {
    obj = objOrString;
  }

  if (
    !obj.id ||
    !Number.isSafeInteger(obj.nativeHeight) ||
    !Number.isSafeInteger(obj.nativeWidth)
  ) {
    throw new Error('Invalid object');
  }

  const previewObject: PreviewProperties = {
    id: obj.id,
    nativeWidth: obj.nativeWidth as number,
    nativeHeight: obj.nativeHeight as number,
  };

  if ('width' in obj && 'height' in obj) {
    // make sure that width and height are numbers higher than 0
    const width = Number(obj.width);
    const height = Number(obj.height);
    if (width > 0 && height > 0) {
      previewObject.width = width;
      previewObject.height = height;
    }
  }

  return previewObject;
};

export const serializePreviewProperties = (previewProperties?: PreviewProperties | null): string | null => {
  if (!previewProperties) {
    return null;
  }

  return JSON.stringify(previewProperties);
};
