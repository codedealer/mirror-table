import type { DriveInvalidPermissionsError } from '~/models/types';

export const folderExists = async (id: string) => {
  if (!id) {
    throw new Error('Folder ID is empty');
  }

  try {
    const driveStore = useDriveStore();
    const client = await driveStore.getClient();
    const response = await client.drive.files.get({
      fileId: id,
      fields: 'id, trashed, capabilities(canListChildren, canAddChildren, canDelete), shared',
    });
    const folder = response.result;
    if (folder.trashed) {
      // the folder was deleted, we need a new one
      return false;
    }
    if (
      !folder.shared ||
      !folder.capabilities?.canListChildren ||
      !folder.capabilities?.canAddChildren ||
      !folder.capabilities?.canDelete
    ) {
      // the folder is not shared, or we don't have permissions
      const err = new Error(`The folder ${id} exists but this app lacks permissions to use it.`) as DriveInvalidPermissionsError;
      err.code = 'drive_invalid_permissions';
    }

    return true;
  } catch (e) {
    const gapiErr = e as gapi.client.Response<gapi.client.drive.File>;
    if (gapiErr?.status === 404 || gapiErr?.status === 403) {
      return false;
    }

    throw e;
  }
};

export const createFolder = async (name: string, parentId?: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  // create folder
  const response = await client.drive.files.create({
    fields: 'id',
    resource: {
      name,
      mimeType: DriveMimeTypes.FOLDER,
      parents: parentId ? [parentId] : undefined,
    },
  });

  const folderId = response.result.id;
  if (!folderId) {
    throw new Error('Failed to create parent folder');
  }

  return folderId;
};

export const shareFolder = async (id: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  // share folder with anyone with link
  await client.drive.permissions.create({
    fileId: id,
    fields: 'id',
    resource: {
      role: 'reader',
      type: 'anyone',
      allowFileDiscovery: false,
    },
  });
};
