import type { DriveFile, DriveTreeNode } from '~/models/types';
import { AssetPropertiesKinds, isDriveAsset } from '~/models/types';

export const DriveTreeNodeFactory = (file: DriveFile): DriveTreeNode => ({
  id: file.id,
  label: file.fileExtension ? stripFileExtension(file.name) : file.name,
  icon: undefined,
  isFolder: file.mimeType === DriveMimeTypes.FOLDER,
  loaded: file.mimeType !== DriveMimeTypes.FOLDER,
  loading: false,
  disabled: false,
  sendToSceneAvailable: isDriveAsset(file)
    && file.appProperties.kind !== AssetPropertiesKinds.TEXT
    && !!file.capabilities?.canDownload
    && !!file.appProperties.preview,
  /* data: { id: file.id }, */
  children: file.mimeType === DriveMimeTypes.FOLDER ? [] : undefined,
});
