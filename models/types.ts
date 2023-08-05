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
