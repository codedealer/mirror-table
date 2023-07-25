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
  provider.addScope('https://www.googleapis.com/auth/drive.appdata');
  provider.addScope('https://www.googleapis.com/auth/drive.appfolder');
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/drive.resource');
  // restricted: provider.addScope('https://www.googleapis.com/auth/drive.metadata');

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
