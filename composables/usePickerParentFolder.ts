import type { InvalidDriveParentFolderError } from '~/models/types';
import { DriveMimeTypes, isGapiErrorResponseResult, isObject } from '~/models/types';

let checkedParentFolder = false;

const checkParentFolder = async (parentId: string) => {
  const err = new Error('Invalid parent folder') as InvalidDriveParentFolderError;
  err.code = 'invalid_drive_parent_folder';

  if (parentId.length > 0) {
    if (checkedParentFolder) {
      return;
    }
    const config = useRuntimeConfig();
    // do not check root folder
    if (parentId === config.public.rootFolder) {
      checkedParentFolder = true;
      return;
    }

    // check if the folder exists
    const driveStore = useDriveStore();
    const client = await driveStore.getClient();

    let response;
    try {
      response = await client.drive.files.get({
        fileId: parentId,
        fields: 'id, capabilities, trashed, isAppAuthorized, shared',
      });
    } catch (e) {
      if ((e as gapi.client.Response<gapi.client.drive.File>)?.status === 404) {
        // the folder does not exist
        throw err;
      }
      if (isObject(e) && 'result' in e && isGapiErrorResponseResult(e.result)) {
        throw new Error(e.result.error.message);
      }

      throw new Error('There was an error checking the workspace folder. Check your Google Drive.');
    }

    const folder = response.result;
    if (folder.trashed) {
      // the folder was deleted, we need a new one
      throw err;
    }
    if (
      !folder.shared ||
      !folder.capabilities?.canListChildren ||
      !folder.capabilities?.canAddChildren ||
      !folder.capabilities?.canDelete ||
      !folder.isAppAuthorized
    ) {
      // the folder is not shared, or we don't have permissions
      throw new Error('There is a problem with the workspace folder. Check your Google Drive.');
    }

    checkedParentFolder = true;
    return;
  }

  // parent cannot be empty
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
      mimeType: DriveMimeTypes.FOLDER,
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

  return folderId;
};

export const usePickerParentFolder = () => {
  return {
    checkParentFolder,
    createParentFolder,
  };
};
