import type { FirebaseAuthError } from 'firebase-admin/lib/utils/error';
import { auth } from '@/utils/firebase-admin';

export default defineNuxtPlugin(async () => {
  const userStore = useUserStore();
  if (!userStore.isLoggedIn || !userStore.idToken) {
    return;
  }

  try {
    const result = await auth.verifyIdToken(userStore.idToken);
    userStore.setUser(result);
  } catch (e) {
    userStore.signOutUser();

    const err = e as FirebaseAuthError;
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/id-token-revoked') {
      console.log('Token expired');

      return;
    }

    console.error(e);
    void navigateTo('/');
  }
});
