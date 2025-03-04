import type {
  AppPropertiesType, AssetPropertiesKind,
  DriveFile,
  DriveFileRaw,
  DriveFileUpdateReturnType,
  DriveInvalidPermissionsError,
  RawMediaObject,
} from '~/models/types';
import { updateFieldMask } from '~/models/types';

type FileResponse = gapi.client.Response<gapi.client.drive.File>;

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

export const generateFileRequest = (client: typeof gapi.client, id: string, mask: string = fieldMask) => {
  if (!id) {
    throw new Error('File ID is empty');
  }

  return client.drive.files.get({
    fileId: id,
    fields: mask,
  });
};

export const generateMediaRequest = (client: typeof gapi.client, id: string) => {
  if (!id) {
    throw new Error('File ID is empty');
  }

  return client.drive.files.get({
    fileId: id,
    alt: 'media',
  });
};

export const parseMediaResponse = (file: DriveFile, response: FileResponse): RawMediaObject | undefined => {
  if (!file.md5Checksum) {
    console.error(`File ${file.id} is missing checksum`);
    return undefined;
  }

  if (!response.headers) {
    console.error(`File ${file.id} is missing response headers`);
    console.log(response);
    return undefined;
  }

  if (!response.headers['X-Goog-Safety-Content-Type'] && !file.mimeType) {
    console.error(`File ${file.id} mime type cannot be determined`);
    return undefined;
  }

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    googleContentType: response.headers['X-Goog-Safety-Content-Type'],
    size: file.size,
    md5Checksum: file.md5Checksum,
    version: file.version,
    loadedAt: Date.now(),
    data: response.body,
  };
};

export const downloadMedia = async (
  id: string,
) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!id) {
    throw new Error('File ID is empty');
  }

  const response = await client.drive.files.get({
    fileId: id,
    alt: 'media',
  });

  return response;
};

export const convertToBlob = (obj: RawMediaObject) => {
  if (!obj.mimeType && !obj.googleContentType) {
    throw new Error('Mime type is cannot be determined');
  }
  return new Blob([
    new Uint8Array(obj.data.length).map((_, i) => obj.data.charCodeAt(i)),
  ], {
    type: obj.mimeType ?? obj.googleContentType,
  });
};

export const listFiles = async (folderId: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  if (!folderId) {
    throw new Error('Folder ID is empty');
  }

  const response = await client.drive.files.list({
    q: `'${folderId}' in parents and trashed = false and (mimeType = '${DriveMimeTypes.FOLDER}' or appProperties has { key = 'type' and value = 'asset' } or appProperties has { key = 'type' and value = 'widget' })`,
    fields: `files(${fieldMask})`,
    orderBy: 'folder, name',
  });

  return response.result.files ? response.result.files as DriveFileRaw[] : [];
};

export const searchFiles = async (
  name: string,
  type: AppPropertiesType = AppPropertiesTypes.ASSET,
  kind?: AssetPropertiesKind,
) => {
  // search just assets for now
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  name = name.replace(/['"]+/g, '');

  let q = `(name contains '${name}' or fullText contains '${name}') and trashed = false and appProperties has { key = 'type' and value = '${type}' }`;
  if (kind) {
    q += ` and appProperties has { key = 'kind' and value = '${kind}' }`;
  }

  const response = await client.drive.files.list({
    q,
    fields: `files(${fieldMask})`,
    pageSize: 10,
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

export type updateMetadataPayload = {
  [key in keyof gapi.client.drive.File]?: string | {
    [x: string]: string | null
  };
};

export const updateMetadata = async (
  id: string,
  metadata: updateMetadataPayload,
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
  metadataPayload: updateMetadataPayload,
  parentId = '',
) => {
  if (!metadataPayload.appProperties || typeof metadataPayload.appProperties !== 'object') {
    const { $logger } = useNuxtApp();
    $logger.drive('App properties %o', metadataPayload.appProperties);
    throw new Error('App properties are empty or invalid when updating a file');
  }
  const metadata: Record<string, any> = {
    name: file.name || 'Untitled',
    mimeType: file.type,
    appProperties: metadataPayload.appProperties,
  };

  if (typeof metadataPayload.contentHints === 'object' && metadataPayload.contentHints.indexableText) {
    metadata.contentHints = metadataPayload.contentHints;
  }

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
  metadata: updateMetadataPayload,
) => {
  if (!fileId) {
    throw new Error('File ID is empty when updating a file');
  }

  const form = generateFileFormData(file, metadata);
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

interface UploadMediaReturnType {
  id: string
  name: string
  mimeType: string
  kind: string
}

export const uploadMedia = async (
  file: File,
  folderId: string,
  metadata: updateMetadataPayload,
) => {
  if (!folderId) {
    throw new Error('Folder ID is empty when uploading a file');
  }

  const form = generateFileFormData(file, metadata, folderId);

  const googleStore = useGoogleAuthStore();
  if (!googleStore.client) {
    throw new Error('Google client is not initialized');
  }

  const authInfo = await googleStore.client.requestToken();

  const response = await $fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authInfo.accessToken}`,
    },
    body: form,
  });

  return response as UploadMediaReturnType;
};
