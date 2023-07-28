import type { Ref } from 'vue';

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
  storage: Ref<AuthorizationInfo>
  requestToken: () => Promise<AuthorizationInfo>
}
