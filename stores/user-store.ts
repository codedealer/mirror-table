import type { User } from 'firebase/auth';
import type { DiceRollerMacro } from '~/models/Dice';
import type { DynamicPanelContentType, Profile, SelectionGroup } from '~/models/types';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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
  // Incremented for every auth event so callbacks from an earlier event cannot
  // become valid again when the same UID signs back in (A → B → A).
  let authGeneration = 0;
  // subscribe to profile updates
  const subscribeToProfileUpdates = (profileUser: User, generation: number) => {
    const profileRef = doc($db, 'users', profileUser.uid).withConverter(
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
        // A queued snapshot from the previous subscription must never restore the
        // previous user's profile after an auth transition.
        if (generation !== authGeneration || user.value?.uid !== profileUser.uid)
          return;
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
    const generation = ++authGeneration;
    const identityChanged = user.value?.uid !== authUser?.uid;
    // In a direct A → B transition Firebase changes auth identity before the B
    // profile snapshot arrives. Invalidate A immediately so consumers cannot
    // treat A's settings or token as B's ready identity during that window.
    if (identityChanged) {
      profile.value = null;
      idToken.value = null;
    }
    user.value = authUser;
    if (user.value) {
      const authUid = user.value.uid;
      subscribeToProfileUpdates(user.value, generation);

      try {
        const token = await user.value.getIdToken();
        // Avoid an older, slower token request overwriting the current user,
        // including when the original UID signs back in later.
        if (generation === authGeneration && user.value?.uid === authUid)
          idToken.value = token;
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

  const updateDiceRollerSavedMacros = async (macros: DiceRollerMacro[]) => {
    // A missing profile is an auth/loading state, not an empty profile. Rejecting
    // makes the macro composable keep its optimistic state from being reported as
    // persisted (and prevents a later reload from erasing a save).
    if (!user.value || !profile.value) {
      throw new Error('Saved macros are unavailable until your profile is ready. Please sign in and try again.');
    }
    const profileRef = doc($db, 'users', user.value.uid).withConverter(
      firestoreDataConverter<Profile>(),
    );
    await updateDoc(profileRef, { 'settings.diceRoller.savedMacros': macros });
  };

  const updateLayoutPanelPin = async (
    panelType: DynamicPanelContentType,
    pinned: boolean,
  ) => {
    if (!user.value || !profile.value) {
      return;
    }
    const profileRef = doc($db, 'users', user.value.uid).withConverter(
      firestoreDataConverter<Profile>(),
    );
    await updateDoc(profileRef, {
      [`settings.layout.sidebar.${panelType}.pinned`]: pinned,
    });
  };

  const updateLayoutGroupActive = async (
    group: SelectionGroup,
    active: boolean,
  ) => {
    if (!user.value || !profile.value) {
      return;
    }
    const profileRef = doc($db, 'users', user.value.uid).withConverter(
      firestoreDataConverter<Profile>(),
    );
    await updateDoc(profileRef, {
      [`settings.layout.sidebar.layers.activeGroups.${group}`]: active,
    });
  };

  return {
    user,
    profile,
    authorizationInfo: skipHydrate(authorizationInfo),
    isLoggedIn,
    isAuthenticated,
    updateProfile,
    updateProfileSettings,
    updateDiceRollerSavedMacros,
    updateLayoutPanelPin,
    updateLayoutGroupActive,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useUserStore, import.meta.hot),
  );
}
