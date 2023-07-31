import type { AuthorizationInfo, UniversalAuthClient, UniversalAuthClientParams } from '~/models/types';
import { expiryFromSeconds } from '~/utils';
import TokenResponse = google.accounts.oauth2.TokenResponse;
import OverridableTokenClientConfig = google.accounts.oauth2.OverridableTokenClientConfig;

export const useImplicitGrantFlowAuth = ({
  clientId,
  scope = '',
  storage,
}: UniversalAuthClientParams): UniversalAuthClient => {
  const g = window.google;
  if (!g) {
    throw new Error('Trying to use Google Identity Service when it is not loaded');
  }

  const oauth2 = g.accounts.oauth2;
  let resolveHook: ((value: AuthorizationInfo | PromiseLike<AuthorizationInfo>) => void) | null = null;
  let rejectHook: ((reason: any) => void) | null = null;

  const callback = (tokenResponse: TokenResponse) => {
    if (tokenResponse.error && tokenResponse.error_description) {
      console.error(tokenResponse.error_description);
      rejectHook && rejectHook(tokenResponse.error_description);
      return;
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

  const requestToken = (config?: OverridableTokenClientConfig): Promise<AuthorizationInfo> => {
    resolveHook = null;
    rejectHook = null;

    // check if the token has not yet expired
    if (storage.value && storage.value.expiry > Date.now()) {
      return Promise.resolve(storage.value);
    }

    return new Promise((resolve, reject) => {
      resolveHook = resolve;
      rejectHook = reject;

      authClient.requestAccessToken(config);
    });
  };

  return {
    requestToken,
  };
};
