import type { AppProperties } from '~/models/types';
import { plainObjFromAssetProperties } from '~/models/AssetProperties';
import { isCropProperties, serializeCropProperties } from '~/models/CropProperties';
import { isAssetProperties, isWidgetProperties } from '~/models/types';
import { plainObjFromWidgetProperties } from '~/models/WidgetProperties';

export { validateDrivePropertySize as validatePayloadSize } from '~/models/DrivePropertyValidation';

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

export const serializeAppProperties = (appProperties?: AppProperties): Record<string, string | null> => {
  if (isAssetProperties(appProperties)) {
    return plainObjFromAssetProperties(appProperties);
  } else if (isWidgetProperties(appProperties)) {
    return plainObjFromWidgetProperties(appProperties);
  } else if (isCropProperties(appProperties)) {
    return serializeCropProperties(appProperties);
  }

  throw new Error('Not implemented');
};
