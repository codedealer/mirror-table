import type { AuthorizationInfo, UniversalAuthClient, UniversalAuthClientParams } from '~/models/types';
import { expiryFromSeconds } from '~/utils';
import OverridableTokenClientConfig = google.accounts.oauth2.OverridableTokenClientConfig;
import TokenResponse = google.accounts.oauth2.TokenResponse;

const tokenTTLToleranceSec = 60 * 1000;

export const useImplicitGrantFlowAuth = ({
  clientId,
  scope = '',
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
  let prompt = '';

  const callback = (tokenResponse: TokenResponse) => {
    if (tokenResponse.error && tokenResponse.error_description) {
      console.error(tokenResponse.error_description);
      rejectHook && rejectHook(tokenResponse.error_description);
      return;
    }

    if (!oauth2.hasGrantedAllScopes(tokenResponse, firstScope, ...requiredScopes)) {
      if (prompt !== 'consent') {
        prompt = 'consent';
      }
      rejectHook && rejectHook(new Error('Re-authorize granting all scopes'));
      return;
    } else {
      prompt = '';
    }

    const ai: AuthorizationInfo = {
      accessToken: tokenResponse.access_token,
      expiry: expiryFromSeconds(tokenResponse.expires_in),
    };

    const googleAuthStore = useGoogleAuthStore();
    googleAuthStore.authorizationInfo = ai;

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

    const googleAuthStore = useGoogleAuthStore();
    // check if the token has not yet expired
    if (!prompt
      && googleAuthStore.authorizationInfo
      && googleAuthStore.authorizationInfo.expiry > (
        Date.now() + tokenTTLToleranceSec
      )
    ) {
      return Promise.resolve(googleAuthStore.authorizationInfo);
    }

    const options: OverridableTokenClientConfig = {
      hint: userStore.user.email,
      prompt,
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
