import type { DriveFile, DriveTreeNode } from '~/models/types';

export const DriveTreeNodeFactory = (file: DriveFile): DriveTreeNode => ({
  id: file.id,
  label: file.name,
  icon: undefined,
  isFolder: file.mimeType === DriveMimeTypes.FOLDER,
  loaded: file.mimeType !== DriveMimeTypes.FOLDER,
  loading: false,
  expanded: false,
  disabled: false,
  data: file,
  children: file.mimeType === DriveMimeTypes.FOLDER ? [] : undefined,
});
