import type { DriveFile, DriveFileRaw } from '~/models/types';
import { AssetPropertiesFactory } from '~/models/AssetProperties';
import { getCropProvenance } from '~/models/CropProperties';
import { isAssetProperties, isWidgetProperties } from '~/models/types';
import { WidgetPropertiesFactory } from '~/models/WidgetProperties';

export const convertToDriveFile = (file: DriveFileRaw) => {
  const cropProvenance = getCropProvenance(file.appProperties, file.properties);
  const driveFile = {
    ...file,
    loading: false,
    loadedAt: Date.now(),
    cropProvenance,
  } as DriveFile;

  // convert properties object if needed
  if (file.appProperties) {
    if (cropProvenance.status === 'unavailable') {
      // Never interpret incompatible private properties on a marked crop.
      delete driveFile.appProperties;
    } else if (cropProvenance.status === 'usable') {
      driveFile.appProperties = cropProvenance.properties;
    } else if (isAssetProperties(file.appProperties)) {
      driveFile.appProperties = AssetPropertiesFactory(file.appProperties);
    } else if (isWidgetProperties(file.appProperties)) {
      driveFile.appProperties = WidgetPropertiesFactory(file.appProperties);
    } else {
      throw new Error('Not implemented');
    }
  }

  return driveFile;
};
