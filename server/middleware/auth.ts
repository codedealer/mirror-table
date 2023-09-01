import { getFirebaseAuth } from '~/server/lib/firebase-admin';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export default defineEventHandler(async (event) => {
  if (event.node.req.url?.startsWith('/api')) {
    // check that x-requested-with header is present
    const xRequestedWith = event.node.req.headers['x-requested-with'];
    if (xRequestedWith !== 'XMLHttpRequest') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const idToken = event.node.req.headers['x-id-token'];

    if (!idToken || Array.isArray(idToken)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Id token not supplied',
      });
    }

    const auth = getFirebaseAuth();

    try {
      event.context.auth = await auth.verifyIdToken(idToken);
    } catch (e) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid Id token supplied',
        message: extractErrorMessage(e),
      });
    }
  }
});
