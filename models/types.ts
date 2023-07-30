import type { Ref } from 'vue';
import type { OverridableTokenClientConfig } from 'vue3-google-signin';

export interface User {
  uid: string
  email?: string | null
}

export interface Profile {
  displayName: string | null
  photoURL: string | null
}

export interface AuthorizationInfo {
  accessToken: string
  expiry: number
}

export interface UniversalAuthClient {
  requestToken: (config?: OverridableTokenClientConfig) => Promise<AuthorizationInfo>
}

export interface UniversalAuthClientParams {
  clientId: string
  scope?: string
  storage: Ref<AuthorizationInfo>
}
