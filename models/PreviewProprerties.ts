import type { PreviewProperties } from '~/models/types';
import { validatePayloadSize } from '~/utils/appPropertiesSerializer';

export const PreviewPropertiesFactory = (
  objOrString: Partial<PreviewProperties> | string,
): PreviewProperties => {
  let obj: Partial<PreviewProperties>;
  if (typeof objOrString === 'string') {
    try {
      const deserializedObj = JSON.parse(objOrString) as Record<string, unknown>;

      // take values of the keys in the deserialized object that are contained in deserializedPropertyDictionary and put them in obj
      obj = Object.fromEntries(
        Object.entries(deserializedObj).filter(
          ([key]) => key in deserializedPropertyDictionary)
          .map(
            ([key, value]) => [deserializedPropertyDictionary[key], value],
          ),
      );

      obj.nativeHeight = Number(obj.nativeHeight);
      obj.nativeWidth = Number(obj.nativeWidth);
      obj.scaleX = Number(obj.scaleX);
      obj.scaleY = Number(obj.scaleY);
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
    scaleX: Number.isSafeInteger(obj.scaleX) ? obj.scaleX as number : 1,
    scaleY: Number.isSafeInteger(obj.scaleY) ? obj.scaleY as number : 1,
  };

  if ('rotation' in obj) {
    const rotation = Number(obj.rotation);
    if (Number.isInteger(rotation)) {
      previewObject.rotation = rotation;
    }
  }

  return previewObject;
};

export const serializePreviewProperties = (previewProperties?: PreviewProperties | null): string | null => {
  if (!previewProperties) {
    return null;
  }

  const serializedObj = Object.fromEntries(
    Object.entries(previewProperties).filter(
      ([key]) => key in serializedPropertyDictionary)
      .map(
        ([key, value]) => [serializedPropertyDictionary[key], value],
      ),
  );

  const payload = JSON.stringify(serializedObj);
  validatePayloadSize('preview', payload);

  return payload;
};
