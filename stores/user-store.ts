import { acceptHMRUpdate, defineStore } from 'pinia';
import type { User } from 'firebase/auth';
import { useAuth } from '@vueuse/firebase/useAuth';
import type { AuthorizationInfo } from '@/models/types';

export const useUserStore = defineStore('user', () => {
  const { $auth } = useNuxtApp();

  let user = ref<User | null>(null);
  let isAuthenticated = computed(() => false);
  if ($auth) {
    const authObject = useAuth($auth);
    user = authObject.user;
    isAuthenticated = authObject.isAuthenticated;
  }
  const idToken = useCookie('idToken', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  const authorizationInfo = useCookie('authorizationInfo', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    default: (): AuthorizationInfo => ({ accessToken: '', expiry: 0 }),
  });

  // true if there is a user token stored in the system
  // indicates that the user was logged in at some point (primarily for ssr)
  const isLoggedIn = computed(() => !!idToken.value);

  // watch only on the client side
  if ($auth) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watchEffect(async () => {
      if (user.value) {
        idToken.value = await user.value.getIdToken();
      } else {
        idToken.value = null;
        authorizationInfo.value = { accessToken: '', expiry: 0 };
      }
    });
  }

  return {
    user,
    idToken,
    authorizationInfo,
    isLoggedIn,
    isAuthenticated,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useUserStore, import.meta.hot),
  );
}
