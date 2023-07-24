import { existsSync } from 'node:fs';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app;

if (!getApps().length) {
  if (!existsSync('./service-account.json')) {
    throw new Error('put service-account.json in the root directory');
  }

  app = initializeApp({
    credential: cert('./service-account.json'),
  });
} else {
  app = getApp();
}

export const auth = getAuth(app);
