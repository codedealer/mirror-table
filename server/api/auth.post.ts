import type { DecodedIdToken } from 'firebase-admin/auth';
import type { AccessTokenReturnType } from '~/models/types';
import { getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { isObject } from '~/models/types';
import { getFirebaseApp } from '~/server/lib/firebase-admin';

const addRefreshToken = async (idToken: DecodedIdToken, refreshToken: string) => {
  const app = getFirebaseApp();
  const db = getFirestore(app);

  return await db.collection('privacy').doc(idToken.uid).set({
    refreshToken,
  });
};

export default defineEventHandler(async (event): Promise<AccessTokenReturnType> => {
  const config = useRuntimeConfig();

  const client = new OAuth2Client({
    clientId: config.public.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.googleAuthRedirectUri,
  });

  const body = await readBody(event) as unknown;

  if (!isObject(body) || !body.code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
    });
  }

  const code = body.code as string;

  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization code is valid but refresh token is missing from Google\'s response',
    });
  }

  await addRefreshToken(event.context.auth as DecodedIdToken, tokens.refresh_token);

  if (!tokens.access_token || !tokens.expiry_date) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Couldn\'t get access token',
    });
  }

  return {
    valid: true,
    accessToken: tokens.access_token,
    expiry: tokens.expiry_date,
  };
});
