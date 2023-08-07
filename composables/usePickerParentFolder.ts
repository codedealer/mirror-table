import type { InvalidDriveParentFolder } from '~/models/types';

const checkParentFolder = (parentId: string) => {
  if (parentId.length > 0) {
    return;
  }

  // parent cannot be empty
  const driveStore = useDriveStore();
  driveStore.parentFolderModalModel = true;
  const err = new Error('Invalid parent folder') as InvalidDriveParentFolder;
  err.code = 'invalid_drive_parent_folder';
  throw err;
};

export const usePickerParentFolder = () => {
  return {
    checkParentFolder,
  };
};
