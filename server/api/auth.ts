import type { App, ServiceAccount } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export default defineEventHandler(async (event) => {
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

  const idToken = getCookie(event, 'idToken');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const auth = getAuth(app);

  try {
    await auth.verifyIdToken(idToken);
  } catch (e) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Id token supplied',
    });
  }

  return { valid: true, authenticated: true };
});
