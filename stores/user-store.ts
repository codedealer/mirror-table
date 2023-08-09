import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';
import type { User } from 'firebase/auth';
import { doc, setDoc } from '@firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { useGoogleAuthStore } from '~/stores/google-auth-store';
import type { Profile } from '~/models/types';
import { ProfileFactory } from '~/models/Profile';

export const useUserStore = defineStore('user', () => {
  const { $auth, $db } = useNuxtApp();

  const user = ref<User | null>(null);
  const profile = ref<Profile | null>(null);
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
  const isAuthenticated = computed(() => !!profile.value);

  let unsubFromProfileUpdates = () => {};
  // subscribe to profile updates
  const subscribeToProfileUpdates = (user: User) => {
    const profileRef = doc($db, 'users', user.uid);
    unsubFromProfileUpdates();
    unsubFromProfileUpdates = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        profile.value = doc.data() as Profile;
      } else {
        const newProfile = ProfileFactory();
        void setDoc(profileRef, newProfile);
      }
    });
  };

  // watch only on the client side
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  $auth && $auth.onAuthStateChanged(async (authUser) => {
    user.value = authUser;
    if (user.value) {
      subscribeToProfileUpdates(user.value);

      idToken.value = await user.value.getIdToken();
    } else {
      unsubFromProfileUpdates();
      profile.value = null;
      idToken.value = null;
      authorizationInfo.value = { accessToken: '', expiry: 0 };
    }
  });

  return {
    user,
    profile,
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
