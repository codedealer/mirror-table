import type { DriveFile, DriveFileRaw } from '~/models/types';
import { isAssetProperties } from '~/models/types';

export const convertToDriveFile = (file: DriveFileRaw) => {
  const driveFile = file as DriveFile;
  driveFile.loading = false;
  driveFile.loadedAt = Date.now();

  // convert properties object if needed
  if (file.appProperties) {
    if (isAssetProperties(file.appProperties)) {
      driveFile.appProperties = AssetPropertiesFactory(file.appProperties);
    } else if (isWidgetProperties(file.appProperties)) {
      driveFile.appProperties = WidgetPropertiesFactory(file.appProperties);
    } else {
      throw new Error('Not implemented');
    }
  }

  return driveFile;
};
