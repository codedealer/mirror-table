import type { AuthorizationInfo, UniversalAuthClient, UniversalAuthClientParams } from '~/models/types';
import { expiryFromSeconds } from '~/utils';
import TokenResponse = google.accounts.oauth2.TokenResponse;
import OverridableTokenClientConfig = google.accounts.oauth2.OverridableTokenClientConfig;

const tokenTTLToleranceSec = 60 * 1000;

export const useImplicitGrantFlowAuth = ({
  clientId,
  scope = '',
  storage,
}: UniversalAuthClientParams): UniversalAuthClient => {
  if (typeof window === 'undefined') {
    throw new TypeError('Call to Google Identity Service on the server side');
  }
  const g = window.google;
  if (!g) {
    throw new Error('Trying to use Google Identity Service when it is not loaded');
  }

  const oauth2 = g.accounts.oauth2;
  let resolveHook: ((value: AuthorizationInfo | PromiseLike<AuthorizationInfo>) => void) | null = null;
  let rejectHook: ((reason: any) => void) | null = null;

  const requiredScopes = scope.split(' ');
  const firstScope = requiredScopes.length > 0 ? requiredScopes.pop() as string : '';
  let needPromptScope = false;

  const callback = (tokenResponse: TokenResponse) => {
    if (tokenResponse.error && tokenResponse.error_description) {
      console.error(tokenResponse.error_description);
      rejectHook && rejectHook(tokenResponse.error_description);
      return;
    }

    if (!oauth2.hasGrantedAllScopes(tokenResponse, firstScope, ...requiredScopes)) {
      needPromptScope = true;
      rejectHook && rejectHook(new Error('Not all scopes were granted'));
      return;
    } else {
      needPromptScope = false;
    }

    const ai: AuthorizationInfo = {
      accessToken: tokenResponse.access_token,
      expiry: expiryFromSeconds(tokenResponse.expires_in),
    };

    storage.value = ai;

    resolveHook && resolveHook(ai);
  };

  const authClient = oauth2.initTokenClient({
    client_id: clientId,
    scope: `openid email profile ${scope}`,
    callback,
  });

  const requestToken = (): Promise<AuthorizationInfo> => {
    resolveHook = null;
    rejectHook = null;

    const userStore = useUserStore();
    if (!userStore.isAuthenticated || !userStore.user?.email) {
      return Promise.reject(new Error('User is not authenticated'));
    }

    // check if the token has not yet expired
    if (!needPromptScope &&
        storage.value &&
        storage.value.expiry > (Date.now() + tokenTTLToleranceSec)) {
      return Promise.resolve(storage.value);
    }

    const options: OverridableTokenClientConfig = {
      hint: userStore.user.email,
      prompt: needPromptScope ? 'consent' : '',
    };

    return new Promise((resolve, reject) => {
      resolveHook = resolve;
      rejectHook = reject;

      authClient.requestAccessToken(options);
    });
  };

  return {
    requestToken,
  };
};
