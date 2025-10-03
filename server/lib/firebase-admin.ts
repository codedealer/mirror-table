import type { App, ServiceAccount } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const getFirebaseApp = (): App => {
  const apps = getApps();
  let app: App;
  if (apps.length === 0) {
    const serviceAccount = JSON.parse(
      process.env.FB_SERVICE_ACCOUNT as string,
    ) as ServiceAccount;
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = apps[0];
  }
  return app;
};

export const getFirebaseAuth = (): ReturnType<typeof getAuth> => {
  const app = getFirebaseApp();
  return getAuth(app);
};
