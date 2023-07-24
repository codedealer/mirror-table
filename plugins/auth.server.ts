import type { FirebaseAuthError } from 'firebase-admin/lib/utils/error';
import { auth } from '@/utils/firebase-admin';

export default defineNuxtPlugin(async (nuxtApp) => {
  const token = '';
  if (!token) {
    return;
  }
  try {
    const result = await auth.verifyIdToken(token);
    console.log(result.uid);
  } catch (e) {
    const err = e as FirebaseAuthError;
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/id-token-revoked') {
      console.log('Token expired');

      return;
    }

    console.error(e);
  }
});
