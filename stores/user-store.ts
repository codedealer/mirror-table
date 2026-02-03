import type { User } from 'firebase/auth';
import type { Profile } from '~/models/types';
import { doc, onSnapshot, setDoc, updateDoc } from '@firebase/firestore';
import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';
import { ProfileFactory } from '~/models/Profile';
import { useGoogleAuthStore } from '~/stores/google-auth-store';
import firestoreDataConverter from '~/utils/firestoreDataConverter';

export const useUserStore = defineStore('user', () => {
  const { $auth, $db } = useNuxtApp();

  const user = ref<User | null>(null);
  const profile = ref<Profile | null>(null);
  const idToken = useCookie('idToken', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  const googleAuthStore = useGoogleAuthStore();
  const { authorizationInfo } = storeToRefs(googleAuthStore);

  // true if there is a user token stored in the system
  // indicates that the user was logged in at some point (primarily for ssr)
  const isLoggedIn = computed(() => !!idToken.value);
  // true if Firebase has confirmed that the user is logged in
  const isAuthenticated = computed(() => !!profile.value);

  let unsubFromProfileUpdates = () => {};
  // subscribe to profile updates
  const subscribeToProfileUpdates = (user: User) => {
    const profileRef = doc($db, 'users', user.uid).withConverter(
      firestoreDataConverter<Profile>(),
    );
    unsubFromProfileUpdates();

    // NOTE:
    // When offline (or before the server answers), Firestore may emit a snapshot
    // from cache where the doc "doesn't exist". Creating a default profile in
    // that state can overwrite an existing profile on reconnect.
    unsubFromProfileUpdates = onSnapshot(
      profileRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          profile.value = snap.data();
          return;
        }

        // Don't write defaults based on cache-only knowledge.
        if (snap.metadata.fromCache) {
          return;
        }

        const newProfile = ProfileFactory();
        // Use merge to avoid wiping future fields if schema grows.
        void setDoc(profileRef, newProfile, { merge: true });
      },
    );
  };

  // watch only on the client side

  $auth && $auth.onAuthStateChanged(async (authUser) => {
    user.value = authUser;
    if (user.value) {
      subscribeToProfileUpdates(user.value);

      try {
        idToken.value = await user.value.getIdToken();
      } catch (e) {
        console.error(e);
      }
    } else {
      unsubFromProfileUpdates();
      profile.value = null;
      idToken.value = null;
      authorizationInfo.value = { accessToken: '', expiry: 0 };
    }
  });

  const updateProfile = async (newProfile: Profile) => {
    if (user.value) {
      // Guard against accidentally persisting empty settings (common when
      // a default profile gets created while offline).
      if (
        profile.value?.settings.driveFolderId
        && !newProfile.settings.driveFolderId
      ) {
        console.warn('Skipping profile update that would clear driveFolderId');
        return;
      }

      const profileRef = doc($db, 'users', user.value.uid).withConverter(
        firestoreDataConverter<Profile>(),
      );
      await setDoc(profileRef, newProfile, { merge: true });
    }
  };

  const updateProfileSettings = async (settings: Partial<Profile['settings']>) => {
    if (!user.value) {
      return;
    }

    // Avoid accidentally clearing persisted settings.
    if (profile.value?.settings.driveFolderId && settings.driveFolderId === '') {
      console.warn('Skipping settings update that would clear driveFolderId');
      return;
    }

    const profileRef = doc($db, 'users', user.value.uid).withConverter(
      firestoreDataConverter<Profile>(),
    );

    const update: Record<string, string> = {};
    if (typeof settings.driveFolderId === 'string') {
      update['settings.driveFolderId'] = settings.driveFolderId;
    }
    if (typeof settings.searchFolderId === 'string') {
      update['settings.searchFolderId'] = settings.searchFolderId;
    }

    if (!Object.keys(update).length) {
      return;
    }

    await updateDoc(profileRef, update);
  };

  return {
    user,
    profile,
    authorizationInfo: skipHydrate(authorizationInfo),
    isLoggedIn,
    isAuthenticated,
    updateProfile,
    updateProfileSettings,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useUserStore, import.meta.hot),
  );
}
