import type { AppProperties } from '~/models/types';
import { isAssetProperties, isWidgetProperties } from '~/models/types';
import { plainObjFromWidgetProperties } from '~/models/WidgetProperties';

export const serializedPropertyDictionary: Record<string, string> = {
  id: 'i',
  nativeWidth: 'z',
  nativeHeight: 'x',
  rotation: 'r',
  width: 'w',
  height: 'h',
  scaleX: 's',
  scaleY: 't',
};

export const deserializedPropertyDictionary: Record<string, string> = Object.fromEntries(
  Object.entries(serializedPropertyDictionary).map(
    ([key, value]) => [value, key],
  ),
);

const maxPayloadSize = 124; // bytes
export const validatePayloadSize = (key: string, payload: string) => {
  if (key.length + payload.length > maxPayloadSize) {
    throw new Error(`Payload for ${key} is too big (${key.length + payload.length} bytes)`);
  }
};

export const serializeAppProperties = (appProperties?: AppProperties): Record<string, string | null> => {
  if (isAssetProperties(appProperties)) {
    return plainObjFromAssetProperties(appProperties);
  } else if (isWidgetProperties(appProperties)) {
    return plainObjFromWidgetProperties(appProperties);
  }

  throw new Error('Not implemented');
};
