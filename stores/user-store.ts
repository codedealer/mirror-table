import { acceptHMRUpdate, defineStore } from 'pinia';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AuthorizationInfo, Profile, User } from '@/models/types';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const profile = ref<Profile | null>(null);
  const idToken = useCookie('idToken', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  const authorizationInfo = useCookie('authorizationInfo', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    default: (): AuthorizationInfo => ({ accessToken: '', expiry: 0 }),
  });
  const authInitialized: Ref<boolean | null> = ref(false);

  const isLoggedIn = computed(() => !!idToken.value);
  const userProfile = computed(() => {
    if (!isLoggedIn.value) {
      return null;
    }

    if (!profile.value) {
      return user.value;
    }

    return {
      ...user.value,
      ...profile.value,
    };
  });

  const setUser = (data: FirebaseUser) => {
    user.value = {
      uid: data.uid,
      email: data.email,
    };
  };

  const setProfile = (data: FirebaseUser) => {
    profile.value = {
      displayName: data.displayName,
      photoURL: data.photoURL,
    };
  };

  const signInUser = async (data: FirebaseUser) => {
    setUser(data);
    setProfile(data);

    try {
      idToken.value = await data.getIdToken();
    } catch (e) {
      console.error(e);
      idToken.value = null;
      user.value = null;
    }
  };

  const signOutUser = () => {
    idToken.value = null;
    user.value = null;
    profile.value = null;
  };

  return {
    idToken,
    authorizationInfo,
    authInitialized,
    isLoggedIn,
    userProfile,
    setUser,
    signInUser,
    signOutUser,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useUserStore, import.meta.hot),
  );
}
