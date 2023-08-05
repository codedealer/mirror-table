import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';
import type { AuthorizationInfo } from '~/models/types';

export const useGoogleAuthStore = defineStore('google-auth', () => {
  const authorizationInfo = useCookie('authorizationInfo', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    default: (): AuthorizationInfo => ({ accessToken: '', expiry: 0 }),
  });

  const config = useRuntimeConfig();
  const { client } = useGoogleIdentityService('implicitGrantFlow', {
    clientId: config.public.clientId,
    scope: 'https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/drive.file',
  });

  return {
    authorizationInfo,
    client: skipHydrate(client),
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useGoogleAuthStore, import.meta.hot),
  );
}
