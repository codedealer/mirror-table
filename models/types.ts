import type { Timestamp } from '@firebase/firestore-types';
import type Konva from 'konva';
import type { DBSchema } from 'idb';
import type { DefineComponent } from 'vue';

export type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends object ? NestedPartial<T[K]> : T[K];
};

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
  WIDGET: 'application/json',
} as const;

export const DriveFileExtensions = {
  'application/vnd.google-apps.folder': '',
  'text/markdown': 'md',
  'application/json': 'json',
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

export const updateFieldMask = 'id, version, md5Checksum, modifiedTime, size, quotaBytesUsed, appProperties, name' as const;

export type DriveFileUpdateReturnType = Required<Pick<gapi.client.drive.File, 'id' | 'version' | 'md5Checksum' | 'modifiedTime' | 'size' | 'quotaBytesUsed' | 'name'>> & Pick<gapi.client.drive.File, 'appProperties'>;

export const AppPropertiesTypes = {
  ASSET: 'asset',
  DEPENDENCY: 'dependency',
  WIDGET: 'widget',
} as const;

export type AppPropertiesType = typeof AppPropertiesTypes[keyof typeof AppPropertiesTypes];

export interface AppProperties {
  type: AppPropertiesType
}

export type DriveFileUpdateObject = Omit<DriveFileUpdateReturnType, 'appProperties'> & { appProperties?: AppProperties };

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
  scaleX: number
  scaleY: number
  rotation?: number
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

export const WidgetTemplates = {
  MARKDOWN: 'markdown',
  CANDELA_PLAYER: 'candela-player',
} as const;

export type WidgetTemplate = typeof WidgetTemplates[keyof typeof WidgetTemplates];

export interface WidgetProperties extends AppProperties {
  type: 'widget'
  template: WidgetTemplate
  firestoreId?: string
  title?: string
}

export const isWidgetProperties = (obj: unknown): obj is WidgetProperties => {
  return isObject(obj) && 'type' in obj && obj.type === AppPropertiesTypes.WIDGET && 'template' in obj && Object.values(WidgetTemplates).includes(obj.template as WidgetTemplate);
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
  loadedAt: number
}

export const isDriveFile = (obj: unknown): obj is DriveFile => {
  return isObject(obj) && 'id' in obj && 'trashed' in obj && 'name' in obj && 'ownedByMe' in obj && 'loading' in obj;
};

export interface DriveAsset extends DriveFile {
  appProperties: AssetProperties
}

export const isDriveAsset = (file: DriveFile): file is DriveAsset => {
  return isAssetProperties(file.appProperties);
};

export interface DriveWidget extends DriveFile {
  appProperties: WidgetProperties
}

export const isDriveWidget = (file: DriveFile): file is DriveWidget => {
  return isWidgetProperties(file.appProperties);
};

export type DriveImage = DriveFile & Required<Pick<gapi.client.drive.File, 'imageMediaMetadata'>>;

export interface ContextAction {
  id: string
  label: string
  icon?: { name: string; color?: string }
  action: (...args: unknown[]) => PromiseLike<void> | void
  disabled: boolean
  pinned: boolean
  alwaysVisible: boolean
}

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
  children?: DriveTreeNode[]
}

export interface ModalWindowContent {
  type: string
  editing: boolean
  data?: unknown
}

export interface ModalWindowContentMarkdown extends ModalWindowContent {
  type: 'markdown'
  data: undefined // markdown content is moved to component
}

export interface ModalWindowContentWidget extends ModalWindowContent {
  type: 'widget'
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
  description?: string
}

export interface ItemSelectorOption {
  id: string
  name?: string
}

export const DynamicPanelModelTypes = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export type DynamicPanelModelType = typeof DynamicPanelModelTypes[keyof typeof DynamicPanelModelTypes];

export const DynamicPanelContentTypes = {
  EXPLORER: 'explorer',
  SESSIONS: 'sessions',
  LAYERS: 'layers',
  WIDGETS: 'widgets',
} as const;

export type DynamicPanelContentType = typeof DynamicPanelContentTypes[keyof typeof DynamicPanelContentTypes];

export const HoverPanelContentTypes = {
  SESSION_CONTROL: 'session-control',
  PRESENTATION_CONTROL: 'presentation-control',
} as const;

export type HoverPanelContentType = typeof HoverPanelContentTypes[keyof typeof HoverPanelContentTypes];

export const HoverPanelModes = {
  AUTO: 'hover',
  MANUAL: 'manual',
} as const;

export type HoverPanelMode = typeof HoverPanelModes[keyof typeof HoverPanelModes];

export const DataRetrievalStrategies = {
  // only listen for changes in in-memory cache passively
  PASSIVE: 'passive',
  // only search the local cache, undefined if not found
  OPTIMISTIC_CACHE: 'cache-optimistic',
  // only search the local cache, throw if not found
  CACHE_ONLY: 'cache',
  // search the local cache, then the remote database
  LAZY: 'lazy',
  // search the local cache if it's relatively fresh (currently 60s), then the remote database
  RECENT: 'recent',
  // ignore cache
  SOURCE: 'source',
} as const;

export type DataRetrievalStrategy = typeof DataRetrievalStrategies[keyof typeof DataRetrievalStrategies];

export interface GetFilesOptions {
  TTL?: number
  skipDisk?: boolean
}

export interface RawMediaObject {
  id: string
  name?: string
  mimeType?: string
  googleContentType?: string
  size?: string
  md5Checksum: string
  version?: string
  loadedAt: number
  data: string
}

export interface CacheSchema extends DBSchema {
  files: {
    key: string
    value: DriveFile
  }
  media: {
    key: string
    value: RawMediaObject
  }
}

// CANVAS TYPES

export interface KonvaComponent<T> {
  getNode: () => T
  getStage: () => Konva.Stage
}

export const CanvasLayerTypes = {
  STATIC: 'cached',
  DYNAMIC: 'dynamic',
} as const;

export type CanvasLayerType = typeof CanvasLayerTypes[keyof typeof CanvasLayerTypes];

export interface ElementContainerConfig extends Konva.NodeConfig {
  id: string
  name: 'element-container'
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
}

export const isContainerNode = (obj: unknown): obj is Konva.Node => {
  return isObject(obj) && 'attrs' in obj && isObject(obj.attrs) && 'name' in obj.attrs && obj.attrs.name === 'element-container';
};

export const SelectionGroups = {
  BACKGROUND: 0,
  ELEMENT: 10,
  HIDDEN: 20,
  SCREEN: 30,
} as const;

export type SelectionGroup = typeof SelectionGroups[keyof typeof SelectionGroups];

export const SelectionGroupNames = {
  [SelectionGroups.BACKGROUND]: 'Background',
  [SelectionGroups.ELEMENT]: 'Element',
  [SelectionGroups.HIDDEN]: 'Hidden',
  [SelectionGroups.SCREEN]: 'Title Screen',
} as const;

export type SelectionGroupName = typeof SelectionGroupNames[keyof typeof SelectionGroupNames];

export const SelectionGroupIcons = {
  [SelectionGroups.BACKGROUND]: 'wallpaper',
  [SelectionGroups.ELEMENT]: 'token',
  [SelectionGroups.HIDDEN]: 'visibility_off',
  [SelectionGroups.SCREEN]: 'dvr',
} as const;

export type SelectionGroupIcon = typeof SelectionGroupIcons[keyof typeof SelectionGroupIcons];

export interface CanvasElementState {
  id: string
  name?: string
  selectable: boolean
  selected: boolean
  error?: unknown
}

export interface CanvasElementStateLoadable extends CanvasElementState {
  loading: boolean
  loaded: boolean
}

export interface CanvasElementStateAsset extends CanvasElementStateLoadable {
  _type: 'asset'
  imageElement?: HTMLImageElement
}

export const isCanvasElementStateAsset = (obj: CanvasElementState): obj is CanvasElementStateAsset => {
  return '_type' in obj && obj._type === 'asset';
};

export interface CanvasTool {
  id: string
  name: string
  icon: string
  disabled: boolean
  active: boolean
  events: Map<string, (e: Konva.KonvaEventObject<unknown>) => void>
  component: DefineComponent<{}, {}, any>
}

// FIRESTORE TYPES

/**
 * Main widget entity. Exists in root collection under owner id.
 */
export interface Widget {
  id: string
  fileId: string
  owner: string
  enabled: boolean
  template: WidgetTemplate
  rank: number
}

export interface WidgetMarkdown extends Widget {
  template: 'markdown'
  avatar: PreviewProperties | null
  content: string
  privateContent: string
}

export interface WidgetCandelaPlayer extends Widget {
  template: 'candela-player'
  player: {
    name: string
    role: string
    speciality: string
    avatar: PreviewProperties | null
    marks: {
      body: number
      mind: number
      bleed: number
    }
    scars: number
  }
  content: string
  privateContent: string
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

/**
 * Each presence represents a client connected to a table.
 * Each presence belongs to a single session group, a group can have many presences.
 * In this structure, a group is flattened to a presence entity.
 */
export interface TableSessionPresence extends SessionGroup {
  sessionId: string
  displayName: string
}
/**
 * Session object for a table.
 * Property is a user id or an auto-generated local session id.
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
  // controls which panels are open to viewers
  panels: {
    [K in DynamicPanelModelType]: boolean
  }
  // lists widget ids of widgets on each panel
  widgets: Record<DynamicPanelModelType, string[]>
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

export interface BaseScene {
  id: string
  path: string[]
}

/**
 * Entity in a subcollection of a table. Each table has many scenes.
 */
export interface Scene extends BaseScene {
  tableId: string
  categoryId: string
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
  searchIndex?: string[]
}

export const isScene = (obj: unknown): obj is Scene => {
  return isObject(obj) && 'id' in obj && 'tableId' in obj && 'categoryId' in obj && 'title' in obj && 'owner' in obj && 'thumbnail' in obj && 'createdAt' in obj && 'archived' in obj && 'deletable' in obj && 'deleted' in obj && 'slug' in obj;
};

export interface SceneElement {
  _type: 'screen' | 'canvas-object'
  id: string
  enabled: boolean
  selectionGroup: SelectionGroup
  defaultRank: number
}

export type Stateful<T extends SceneElement, U extends CanvasElementState> = {
  [K in keyof T]: T[K]
} & {
  _state: U
};

export interface SceneElementCanvasObject extends SceneElement {
  _type: 'canvas-object'
  type: string
  container: ElementContainerConfig
}

export const isSceneElementCanvasObject = (
  obj: SceneElement,
): obj is SceneElementCanvasObject => {
  return obj._type === 'canvas-object';
};

export interface CanvasObjectInteraction {
  enabled: boolean
  action: string
  payload: unknown
  tooltip: string | null
}

export interface SceneElementCanvasObjectInteractive {
  interaction?: CanvasObjectInteraction
}

export interface CanvasObjectSceneMoveInteraction extends CanvasObjectInteraction {
  action: 'scene-move'
  payload: BaseScene
}

type SceneElementCanvasObjectAssetProperties = Omit<AssetProperties, 'preview'> &
{
  id: string
  preview: PreviewProperties
};

export interface SceneElementCanvasObjectAsset extends
  SceneElementCanvasObject,
  SceneElementCanvasObjectInteractive {
  type: 'asset'
  asset: SceneElementCanvasObjectAssetProperties
  image?: Konva.ImageConfig
}

export const isSceneElementCanvasObjectAsset = (
  obj: SceneElementCanvasObject,
): obj is SceneElementCanvasObjectAsset => {
  return obj.type === 'asset';
};

export const isStateful = <T extends SceneElementCanvasObject, U extends CanvasElementState>(
  obj: Stateful<SceneElementCanvasObject, CanvasElementState>,
  elementPredicate: (element: SceneElementCanvasObject) => element is T,
  statePredicate: (state: CanvasElementState) => state is U,
): obj is Stateful<T, U> => {
  return statePredicate(obj._state) && elementPredicate(obj);
};

export interface SceneElementScreen extends SceneElement {
  _type: 'screen'
  file: string
  thumbnail: string | null
}

export const isSceneElementScreen = (
  obj: SceneElement,
): obj is SceneElementScreen => {
  return obj._type === 'screen';
};

export interface LayerGroup {
  name: SelectionGroupName
  icon?: string
}

export interface LayerItem<T extends SceneElement | LayerGroup> {
  id: string
  type: T extends SceneElement ? 'element' : 'group'
  item: T
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
