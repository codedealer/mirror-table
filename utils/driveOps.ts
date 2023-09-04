import type { DriveFile, DriveInvalidPermissionsError } from '~/models/types';

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

  if (!name) {
    throw new Error('Folder name is empty');
  }

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

export const getFile = async (id: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!id) {
    throw new Error('File ID is empty');
  }

  const response = await client.drive.files.get({
    fileId: id,
    fields: fieldMask,
  });

  return response.result as DriveFile;
};

export const listFiles = async (folderId: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!folderId) {
    throw new Error('Folder ID is empty');
  }

  const response = await client.drive.files.list({
    q: `'${folderId}' in parents and trashed = false and (mimeType = '${DriveMimeTypes.FOLDER}' or appProperties has { key = 'type' and value = 'asset' })`,
    fields: `files(${fieldMask})`,
    orderBy: 'folder, name',
  });

  return response.result.files ? response.result.files as DriveFile[] : [];
};

export const buildNodes = (files: DriveFile[]) => {
  const nodes = files.map(file => DriveTreeNodeFactory(file));

  return nodes;
};

export const deleteFile = async (id: string, restore: boolean) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!id) {
    throw new Error('File ID is empty');
  }

  // trash the file instead of deleting it
  await client.drive.files.update({
    fileId: id,
    fields: 'id',
    resource: {
      trashed: !restore,
    },
  });
};

const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

export const uploadFile = async (file: File, folderId: string, appProperties = {
  type: 'asset',
}) => {
  if (!folderId) {
    throw new Error('Folder ID is empty when uploading a file');
  }

  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: [folderId],
    appProperties,
  };

  const metadataBlob = new Blob(
    [JSON.stringify(metadata)],
    { type: 'application/json' },
  );

  const form = new FormData();
  form.append('metadata', metadataBlob);
  form.append('file', file);

  const googleStore = useGoogleAuthStore();
  const authInfo = await googleStore.client!.requestToken();

  const response = await $fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authInfo.accessToken}`,
    },
    body: form,
  });

  return response as gapi.client.Response<gapi.client.drive.File>;
};
