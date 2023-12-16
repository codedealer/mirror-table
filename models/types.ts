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

export const PickerViewTemplates = {
  ALL: 'all',
  IMAGES: 'images',
  MEDIA: 'media',
} as const;

export type PickerViewTemplate = typeof PickerViewTemplates[keyof typeof PickerViewTemplates];

export interface BuildPickerOptions {
  parentId: string
  uploadParentId?: string
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
  MARKDOWN: 'text/markdown',
} as const;

export const DriveFileExtensions = {
  'application/vnd.google-apps.folder': '',
  'text/markdown': 'md',
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

export const updateFieldMask = 'id, version, md5Checksum, modifiedTime, size, quotaBytesUsed' as const;

export type DriveFileUpdateReturnType = Required<Pick<gapi.client.drive.File, 'id' | 'version' | 'md5Checksum' | 'modifiedTime' | 'size' | 'quotaBytesUsed'>>;

export const AppPropertiesTypes = {
  ASSET: 'asset',
  DEPENDENCY: 'dependency',
  WIDGET: 'widget',
} as const;

export type AppPropertiesType = typeof AppPropertiesTypes[keyof typeof AppPropertiesTypes];

export interface AppProperties {
  type: AppPropertiesType
}

export const AssetPropertiesKinds = {
  TEXT: 'text',
  IMAGE: 'image',
  COMPLEX: 'complex',
} as const;

export type AssetPropertiesKind = typeof AssetPropertiesKinds[keyof typeof AssetPropertiesKinds];

export interface PreviewProperties {
  id: string // drive file id of an image
  nativeWidth: number
  nativeHeight: number
  rotation?: number
  width?: number
  height?: number
}

export interface AssetProperties extends AppProperties {
  type: 'asset'
  kind: AssetPropertiesKind
  title: string
  showTitle: boolean
  preview?: PreviewProperties | null // null is for the api to remove the property
}

export const isAssetProperties = (obj: unknown): obj is AssetProperties => {
  return isObject(obj) && 'type' in obj && obj.type === AppPropertiesTypes.ASSET && 'kind' in obj && Object.values(AssetPropertiesKinds).includes(obj.kind as AssetPropertiesKind);
};

export interface DriveFileCapabilities {
  canEdit?: boolean
  canCopy?: boolean
  canDelete?: boolean
  canListChildren?: boolean
  canAddChildren?: boolean
  canShare?: boolean
  canDownload?: boolean
}

type OptionalDriveFile = Pick<gapi.client.drive.File, 'id' | 'trashed' | 'name' | 'ownedByMe' | 'originalFilename' | 'mimeType' | 'shared' | 'iconLink' | 'imageMediaMetadata' | 'createdTime' | 'modifiedTime' | 'size' | 'fileExtension' | 'properties' | 'appProperties' | 'md5Checksum' | 'version' | 'videoMediaMetadata' | 'thumbnailLink' | 'thumbnailVersion' | 'quotaBytesUsed' | 'parents'> & { capabilities?: DriveFileCapabilities };

export type DriveFileRaw = Required<Pick<OptionalDriveFile, 'id' | 'trashed' | 'name' | 'originalFilename' | 'shared' | 'ownedByMe'>> & OptionalDriveFile;

export interface DriveFile extends Omit<DriveFileRaw, 'appProperties'> {
  appProperties?: AppProperties
  loading: boolean
}

export interface DriveAsset extends DriveFile {
  appProperties: AssetProperties
}

export type DriveImage = DriveFile & Required<Pick<gapi.client.drive.File, 'imageMediaMetadata'>>;

export interface TreeNode {
  $folded: boolean
  id: string
  label: string
  isFolder: boolean
  loaded: boolean
  loading: boolean
  disabled: boolean
  icon?: string
  children?: TreeNode[]
}

export interface DriveTreeNode extends TreeNode {
  id: string // coincides with DriveFile.id
  /* data?: { id: string } */
  children?: DriveTreeNode[]
}

export interface ModalWindowContent {
  type: string
  editing: boolean
  data: unknown
}

export interface ModalWindowContentMarkdown extends ModalWindowContent {
  type: 'markdown'
  data: string // markdown content
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
}

export interface SelectOption {
  text: string
  value: string
}

export const DynamicPanelModelTypes = {
  RIGHT: 'right',
  LEFT: 'left',
} as const;

export type DynamicPanelModelType = typeof DynamicPanelModelTypes[keyof typeof DynamicPanelModelTypes];

export const DynamicPanelContentTypes = {
  EXPLORER: 'explorer',
  SESSIONS: 'sessions',
} as const;

export type DynamicPanelContentType = typeof DynamicPanelContentTypes[keyof typeof DynamicPanelContentTypes];

export const HoverPanelContentTypes = {
  SESSION_CONTROL: 'session-control',
} as const;

export type HoverPanelContentType = typeof HoverPanelContentTypes[keyof typeof HoverPanelContentTypes];

export const HoverPanelModes = {
  AUTO: 'hover',
  MANUAL: 'manual',
} as const;

export type HoverPanelMode = typeof HoverPanelModes[keyof typeof HoverPanelModes];

// FIRESTORE TYPES

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
  role: 'owner' | 'editor' | 'viewer'
  thumbnail: DriveFile | null
  type: 'private' | 'public'
  slug: string
  deleted: boolean
}

export interface SessionGroup {
  groupId: string | null
  groupLabel?: string
  color: string
  sceneId: string
  path: string[]
  enabled: boolean
}

export interface TableSessionPresence extends SessionGroup {
  sessionId: string
  displayName: string
}
/**
 * Session object for a table.
 * Property is a user id
 */
export interface TableSession {
  [sessionId: string]: TableSessionPresence
}

/**
 * Main table entity. Exists in root collection. Each table has a single owner.
 */
export interface Table {
  id: string
  title: string
  rootCategoryId: string
  owner: string
  editors: string[]
  viewers: string[]
  session: TableSession
  createdAt: Timestamp
  slug: string
}

/**
 * Entity in subcollection of a table. Each table has many categories.
 * Categories are used to group scenes.
 * Supports hierarchical structure: a category can have a parent category.
 */
export interface Category {
  id: string
  tableId: string
  title: string
  parentId: string | null
  owner: string
  createdAt: Timestamp
  deletable: boolean
  deleted: boolean
}

/**
 * Entity in a subcollection of a table. Each table has many scenes.
 */
export interface Scene {
  id: string
  tableId: string
  categoryId: string
  path: string[]
  title: string
  owner: string
  thumbnail: DriveFile | string | null
  createdAt: Timestamp
  archived: boolean
  deletable: boolean
  deleted: boolean
  slug: string
  settings: {
    [x: string]: unknown
  }
}

export const isScene = (obj: unknown): obj is Scene => {
  return isObject(obj) && 'id' in obj && 'tableId' in obj && 'categoryId' in obj && 'title' in obj && 'owner' in obj && 'thumbnail' in obj && 'createdAt' in obj && 'archived' in obj && 'deletable' in obj && 'deleted' in obj && 'slug' in obj;
};

/**
 * DEPRECATED: needs to be replaced with CategoryOrder
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
  OWN: 'own',
  EDIT: 'edit',
  VIEW: 'view',
  PRESENTATION: 'local',
  INVALID: 'invalid',
} as const;

export type TableMode = typeof TableModes[keyof typeof TableModes];
