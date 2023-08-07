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
}

export interface Profile {
  settings: {
    driveFolderId: string
  }
}

export interface InvalidDriveParentFolder extends Error {
  code: 'invalid_drive_parent_folder'
}

export const isInvalidDriveParentFolder = (err: unknown): err is InvalidDriveParentFolder => {
  return !!err && typeof err === 'object' && 'code' in err && err.code === 'invalid_drive_parent_folder';
};
