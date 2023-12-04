import type { DriveFile, DriveTreeNode } from '~/models/types';

export const DriveTreeNodeFactory = (file: DriveFile): DriveTreeNode => ({
  $folded: true,
  id: file.id,
  label: file.fileExtension ? stripFileExtension(file.name) : file.name,
  icon: undefined,
  isFolder: file.mimeType === DriveMimeTypes.FOLDER,
  loaded: file.mimeType !== DriveMimeTypes.FOLDER,
  loading: false,
  disabled: false,
  data: file,
  children: file.mimeType === DriveMimeTypes.FOLDER ? [] : undefined,
});
