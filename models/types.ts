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
    searchFolderId: string
  }
}

export interface DriveInvalidParentFolderError extends Error {
  code: 'drive_invalid_parent_folder'
}

export const isObject = (obj: unknown): obj is Record<string, unknown> => {
  return !!obj && typeof obj === 'object';
};

export const isDriveInvalidParentFolderError = (err: unknown): err is DriveInvalidParentFolderError => {
  return isObject(err) && 'code' in err && err.code === 'drive_invalid_parent_folder';
};

export interface DriveInvalidPermissionsError extends Error {
  code: 'drive_invalid_permissions'
}

export const isDriveInvalidPermissionsError = (err: unknown): err is DriveInvalidPermissionsError => {
  return isObject(err) && 'code' in err && err.code === 'drive_invalid_permissions';
};

export interface DriveInvalidSearchFolderError extends Error {
  code: 'drive_invalid_search_folder'
}

export const isDriveInvalidSearchFolderError = (err: unknown): err is DriveInvalidSearchFolderError => {
  return isObject(err) && 'code' in err && err.code === 'drive_invalid_search_folder';
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

export interface AccessTokenReturnType {
  accessToken?: string
  expiry?: number
  valid: boolean
  reason?: string
  needsConsent?: boolean
}

export const fieldMask = 'id, trashed, name, ownedByMe, originalFilename, mimeType, shared, iconLink, imageMediaMetadata, createdTime, modifiedTime, fileExtension, properties, appProperties, md5Checksum, version, videoMediaMetadata, thumbnailLink, thumbnailVersion, size, quotaBytesUsed, parents, capabilities/canEdit, capabilities/canCopy, capabilities/canDelete, capabilities/canListChildren, capabilities/canAddChildren, capabilities/canShare, capabilities/canDownload' as const;

export interface DriveFileCapabilities {
  canEdit?: boolean
  canCopy?: boolean
  canDelete?: boolean
  canListChildren?: boolean
  canAddChildren?: boolean
  canShare?: boolean
  canDownload?: boolean
}

type OptionalDriveFile = Pick<gapi.client.drive.File, 'id' | 'trashed' | 'name' | 'ownedByMe' | 'originalFilename' | 'mimeType' | 'shared' | 'iconLink' | 'imageMediaMetadata' | 'createdTime' | 'modifiedTime' | 'size' | 'fileExtension' | 'properties' | 'appProperties' | 'md5Checksum' | 'version' | 'videoMediaMetadata' | 'thumbnailLink' | 'thumbnailVersion' | 'quotaBytesUsed' | 'parents'> & {
  capabilities?: DriveFileCapabilities
};

export type DriveFile = Required<Pick<OptionalDriveFile, 'id' | 'trashed' | 'name' | 'originalFilename' | 'shared' | 'ownedByMe'>> & OptionalDriveFile;

export interface DriveTreeNode {
  $folded: boolean
  id: string
  label: string
  icon?: string
  isFolder: boolean
  loaded: boolean
  loading: boolean
  disabled: boolean
  data?: DriveFile
  children?: DriveTreeNode[]
}

export interface ModalWindowContent {
  type: string
  editing: boolean
  data: unknown
}

export interface ModalWindowContentMarkdown extends ModalWindowContent {
  type: 'markdown'
  data: {
    meta: DriveFile
    body: string
  }
}

export const ModalWindowStatus = {
  NEW: 'new',
  DIRTY: 'dirty',
  LOADING: 'loading',
  SYNCED: 'sync',
  ERROR: 'error',
} as const;

export interface ModalWindow {
  id: string
  title: string
  pinned: boolean
  active: boolean
  status: typeof ModalWindowStatus[keyof typeof ModalWindowStatus]
  content: ModalWindowContent
  node?: DriveTreeNode
}

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
  deleted: boolean
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

/**
 * Entity in a subcollection of a table. Each table has many scenes.
 */
export interface Scene {
  id: string
  tableId: string
  title: string
  thumbnail: DriveFile | string | null
  createdAt: Timestamp
  archived: boolean
  slug: string
}

/**
 * Document that holds the sort map for a scene. Stored under user entity.
 */
export interface TableScenesSortMap {
  tableId: string
  map: string[]
}

export interface TablePermissions {
  isOwner: boolean
  isEditor: boolean
  isViewer: boolean
}

export const TableModes = {
  own: 'own',
  edit: 'edit',
  view: 'view',
  invalid: 'invalid',
} as const;

export type TableMode = typeof TableModes[keyof typeof TableModes];
