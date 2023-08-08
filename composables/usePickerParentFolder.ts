import type { InvalidDriveParentFolderError } from '~/models/types';

const checkParentFolder = (parentId: string) => {
  if (parentId.length > 0) {
    // TODO: check that the folder exists on drive
    return;
  }

  // parent cannot be empty
  const err = new Error('Invalid parent folder') as InvalidDriveParentFolderError;
  err.code = 'invalid_drive_parent_folder';
  throw err;
};

const createParentFolder = async (name: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  // create folder
  const response = await client.drive.files.create({
    fields: 'id',
    resource: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    },
  });

  const folderId = response.result.id;
  if (!folderId) {
    throw new Error('Failed to create parent folder');
  }

  // share folder with anyone with link
  await client.drive.permissions.create({
    fileId: folderId,
    fields: 'id',
    resource: {
      role: 'reader',
      type: 'anyone',
      allowFileDiscovery: false,
    },
  });
};

export const usePickerParentFolder = () => {
  return {
    checkParentFolder,
    createParentFolder,
  };
};
