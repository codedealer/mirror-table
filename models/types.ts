import type { Timestamp } from '@firebase/firestore-types';

export interface AuthorizationInfo {
  accessToken: string
  expiry: number
}

export interface UniversalAuthClient {
  requestToken: () => Promise<AuthorizationInfo>
}

export interface UniversalAuthClientParams {
  clientId: string
  scope?: string
}

export type PickerViewTemplate = 'all' | 'images' | 'media';

export interface BuildPickerOptions {
  parentId: string
  template?: PickerViewTemplate
  allowMultiSelect?: boolean
  allowUpload?: boolean
  uploadOnly?: boolean
  callback?: (result: google.picker.ResponseObject) => void
}

export interface Profile {
  settings: {
    driveFolderId: string
  }
}

export interface InvalidDriveParentFolderError extends Error {
  code: 'invalid_drive_parent_folder'
}

export const isObject = (obj: unknown): obj is Record<string, unknown> => {
  return !!obj && typeof obj === 'object';
};

export const isInvalidDriveParentFolderError = (err: unknown): err is InvalidDriveParentFolderError => {
  return isObject(err) && 'code' in err && err.code === 'invalid_drive_parent_folder';
};

export interface GapiErrorResponseResult {
  error: {
    code: number
    message: string
    errors: {
      domain: string
      reason: string
      message: string
    }
  }
}

export const isGapiErrorResponseResult = (obj: unknown): obj is GapiErrorResponseResult => {
  return isObject(obj) && 'error' in obj && isObject(obj.error);
};

export const DriveMimeTypes = {
  FOLDER: 'application/vnd.google-apps.folder',
} as const;

export interface Notification {
  id: string
  icon?: string
  title?: string
  message: string
  type?: 'success' | 'info' | 'warning' | 'error'
  duration?: number
  color?: string
}

type OptionalDriveFile = Pick<gapi.client.drive.File, 'id' | 'trashed' | 'name' | 'originalFilename' | 'mimeType' | 'shared' | 'isAppAuthorized' | 'imageMediaMetadata' | 'createdTime' | 'modifiedTime' | 'size' | 'fileExtension' | 'properties' | 'appProperties' | 'md5Checksum' | 'version' | 'videoMediaMetadata' | 'thumbnailLink' | 'permissionIds' | 'quotaBytesUsed' | 'capabilities'>;

export type DriveFile = Required<Pick<OptionalDriveFile, 'id' | 'trashed' | 'name' | 'originalFilename' | 'shared' | 'isAppAuthorized'>> & OptionalDriveFile;

/**
 * Data for a table card that appears on a dashboard. Each user has a copy.
 */
export interface TableCard {
  id: string
  title: string
  createdAt: Timestamp
  lastAccess: Timestamp
  owner: {
    displayName: string
    photoURL: string
    email: string
  }
  role: string
  thumbnail: DriveFile | null
  type: 'private' | 'public'
  slug: string
}

/**
 * Main table entity. Exists in root collection. Each table has a single owner.
 */
export interface Table {
  id: string
  title: string
  pointer: string
  createdAt: Timestamp
  owner: string
  editors: string[]
  viewers: string[]
  slug: string
}

export interface Scene {
  id: string
  tableId: string
  title: string
  thumbnail: DriveFile | string | null
  createdAt: Timestamp
  archived: boolean
  slug: string
}

export interface TableScenesSortMap {
  tableId: string
  map: Record<string, number>
}
