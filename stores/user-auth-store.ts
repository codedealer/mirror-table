import { acceptHMRUpdate, defineStore } from 'pinia';
import type { AuthorizationInfo } from '~/models/types';

export const useUserAuthStore = defineStore('user-auth', () => {
  const authorizationInfo = useCookie('authorizationInfo', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    default: (): AuthorizationInfo => ({ accessToken: '', expiry: 0 }),
  });

  return {
    authorizationInfo,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useUserAuthStore, import.meta.hot),
  );
}
