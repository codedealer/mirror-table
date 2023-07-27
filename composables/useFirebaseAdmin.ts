import { getAuth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin/app';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';

export const useFirebaseAdmin = () => {
  let app;

  if (!getApps().length) {
    const config = useRuntimeConfig();

    app = initializeApp({
      credential: cert(JSON.parse(
        config.fbServiceAccount,
      ) as ServiceAccount),
    });
  } else {
    app = getApp();
  }

  return getAuth(app);
};
