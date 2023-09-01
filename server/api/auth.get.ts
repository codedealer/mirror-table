import type { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Credentials } from 'google-auth-library';
import { OAuth2Client } from 'google-auth-library';
import type { AccessTokenReturnType } from '~/models/types';
import { getFirebaseApp } from '~/server/lib/firebase-admin';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const getRefreshToken = async (app: App, idToken: DecodedIdToken) => {
  const db = getFirestore(app);

  const doc = await db.collection('privacy').doc(idToken.uid).get();

  return doc.data()?.refreshToken as string | undefined;
};

export default defineEventHandler(async (event): Promise<AccessTokenReturnType> => {
  const app = getFirebaseApp();

  const decodedIdToken = event.context.auth as DecodedIdToken;

  let refreshToken;
  try {
    refreshToken = await getRefreshToken(app, decodedIdToken);

    if (!refreshToken) {
      return {
        valid: false,
        reason: 'Refresh token not found',
        needsConsent: true,
      };
    }
  } catch (e) {
    return { valid: false, reason: extractErrorMessage(e) };
  }

  const config = useRuntimeConfig();

  const client = new OAuth2Client({
    clientId: config.public.clientId,
  });

  client.setCredentials({
    refresh_token: refreshToken,
    id_token: event.node.req.headers['x-id-token'] as string,
  });

  let credentials: Credentials;
  try {
    const tokenResponse = await client.refreshAccessToken();
    credentials = tokenResponse.credentials;

    if (!credentials.access_token || !credentials.expiry_date) {
      return { valid: false, reason: 'Couldn\'t get access token' };
    }
  } catch (e) {
    const errorMessage = extractErrorMessage(e);
    if (
      errorMessage === 'invalid_grant' ||
      errorMessage === 'invalid_request'
    ) {
      return {
        valid: false,
        reason: 'Refresh token invalid',
        needsConsent: true,
      };
    }
    return { valid: false, reason: errorMessage };
  }

  return {
    valid: true,
    accessToken: credentials.access_token,
    expiry: credentials.expiry_date,
  };
});
