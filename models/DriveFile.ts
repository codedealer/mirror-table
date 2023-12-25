import type { DriveAsset, DriveFile, DriveFileRaw } from '~/models/types';
import { isAssetProperties } from '~/models/types';

export const convertToDriveFile = (file: DriveFileRaw) => {
  const driveFile = file as DriveFile;
  driveFile.loading = false;
  driveFile.loadedAt = Date.now();

  // convert to DriveAsset if needed
  if (file.appProperties) {
    if (isAssetProperties(file.appProperties)) {
      const asset = {
        ...driveFile,
        appProperties: AssetPropertiesFactory(file.appProperties),
      } as unknown as DriveAsset;

      return asset;
    } else {
      throw new Error('Not implemented');
    }
  }

  return driveFile;
};
