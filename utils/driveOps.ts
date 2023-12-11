import type { DriveFile, DriveFileRaw, DriveFileUpdateReturnType, DriveInvalidPermissionsError } from '~/models/types';
import { updateFieldMask } from '~/models/types';

export const folderExists = async (id: string) => {
  if (!id) {
    throw new Error('Folder ID is empty');
  }

  let folder: gapi.client.drive.File | undefined;

  try {
    const driveStore = useDriveStore();
    const client = await driveStore.getClient();
    const response = await client.drive.files.get({
      fileId: id,
      fields: 'id, trashed, capabilities(canListChildren, canAddChildren, canDelete), shared',
    });
    folder = response.result;
  } catch (e) {
    const gapiErr = e as gapi.client.Response<gapi.client.drive.File>;
    if (gapiErr?.status === 404 || gapiErr?.status === 403) {
      return false;
    }

    throw e;
  }

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

    throw err;
  }

  return true;
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

export const getFile = async <T extends gapi.client.drive.File>(id: string, mask: string = fieldMask) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!id) {
    throw new Error('File ID is empty');
  }

  const response = await client.drive.files.get({
    fileId: id,
    fields: mask,
  });

  return response.result as T;
};

export const downloadMedia = async (id: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!id) {
    throw new Error('File ID is empty');
  }

  const response = await client.drive.files.get({
    fileId: id,
    alt: 'media',
  });

  return response.body;
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

  return response.result.files ? response.result.files as DriveFileRaw[] : [];
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

export const updateMetadata = async (
  id: string,
  metadata: { [key in keyof gapi.client.drive.File]?: string | { [x: string]: string | null } },
) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!id) {
    throw new Error('File ID is empty');
  }

  const response = await client.drive.files.update({
    fileId: id,
    fields: updateFieldMask,
    // @ts-expect-error - gapi types are wrong; null is accepted
    resource: metadata,
  });

  return response.result as DriveFileUpdateReturnType;
};

const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

const generateFileFormData = (
  file: File,
  appProperties: Record<string, string | null>,
  parentId = '',
) => {
  const metadata: Record<string, any> = {
    name: file.name,
    mimeType: file.type,
    appProperties,
  };

  if (parentId.length) {
    metadata.parents = [parentId];
  }

  const metadataBlob = new Blob(
    [JSON.stringify(metadata)],
    { type: 'application/json' },
  );

  const form = new FormData();
  form.append('metadata', metadataBlob);
  form.append('file', file);

  return form;
};

export const updateMedia = async (
  fileId: string,
  file: File,
  appProperties: Record<string, string | null>,
) => {
  if (!fileId) {
    throw new Error('File ID is empty when updating a file');
  }

  const form = generateFileFormData(file, appProperties);
  const updateUrl = new URL(uploadUrl);
  updateUrl.pathname = `/upload/drive/v3/files/${fileId}`;

  const googleStore = useGoogleAuthStore();
  if (!googleStore.client) {
    throw new Error('Google client is not initialized');
  }

  const authInfo = await googleStore.client.requestToken();

  void await $fetch(updateUrl.toString(), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authInfo.accessToken}`,
    },
    body: form,
  });
};

export const uploadMedia = async (
  file: File,
  folderId: string,
  appProperties: Record<string, string | null>,
) => {
  if (!folderId) {
    throw new Error('Folder ID is empty when uploading a file');
  }

  const form = generateFileFormData(file, appProperties, folderId);

  const googleStore = useGoogleAuthStore();
  if (!googleStore.client) {
    throw new Error('Google client is not initialized');
  }

  const authInfo = await googleStore.client.requestToken();

  void await $fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authInfo.accessToken}`,
    },
    body: form,
  });
};
