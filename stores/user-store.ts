import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';
import type { User } from 'firebase/auth';
import { useGoogleAuthStore } from '~/stores/google-auth-store';

export const useUserStore = defineStore('user', () => {
  const { $auth } = useNuxtApp();

  const user = ref<User | null>(null);
  const idToken = useCookie('idToken', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  const googleAuthStore = useGoogleAuthStore();
  const { authorizationInfo } = toRefs(googleAuthStore);

  // true if there is a user token stored in the system
  // indicates that the user was logged in at some point (primarily for ssr)
  const isLoggedIn = computed(() => !!idToken.value);
  // true if Firebase has confirmed that the user is logged in
  const isAuthenticated = computed(() => !!user.value);

  // watch only on the client side
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  $auth && $auth.onIdTokenChanged(async (authUser) => {
    user.value = authUser;
    if (user.value) {
      idToken.value = await user.value.getIdToken();
    } else {
      idToken.value = null;
      authorizationInfo.value = { accessToken: '', expiry: 0 };
    }
  });

  return {
    user,
    authorizationInfo: skipHydrate(authorizationInfo),
    isLoggedIn,
    isAuthenticated,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useUserStore, import.meta.hot),
  );
}
