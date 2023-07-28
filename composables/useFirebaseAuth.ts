import type { NextOrObserver, User } from '@firebase/auth';
import {
  GoogleAuthProvider,
  signOut as fireBaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
} from '@firebase/auth';

export async function signIn () {
  const { $auth } = useNuxtApp();

  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup($auth, provider);
    return result.user;
  } catch (error) {
    console.error(error);
  }

  return null;
}

export async function signOut () {
  const { $auth } = useNuxtApp();

  return await fireBaseSignOut($auth);
}

export function initAuth (callback: NextOrObserver<User>): void {
  const { $auth } = useNuxtApp();

  if (!$auth) {
    return;
  }

  onAuthStateChanged($auth, callback);
}
