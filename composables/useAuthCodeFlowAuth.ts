import type {
  AccessTokenReturnType,
  AuthorizationInfo,
  UniversalAuthClient,
  UniversalAuthClientParams,
} from '~/models/types';
import CodeResponse = google.accounts.oauth2.CodeResponse;

const tokenTTLToleranceSec = 60 * 1000;

export const useAuthCodeFlowAuth = ({
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

  let resolveHook: ((code: string) => void) | null = null;
  let rejectHook: ((reason: any) => void) | null = null;

  const callback = (codeResponse: CodeResponse) => {
    if (codeResponse.error && codeResponse.error_description) {
      console.error(codeResponse.error_description);
      rejectHook && rejectHook(codeResponse.error_description);
      return;
    }

    resolveHook && resolveHook(codeResponse.code);
  };

  const getAuthCode = (email: string): Promise<string> => {
    resolveHook = null;
    rejectHook = null;

    const authClient = g.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: `openid email profile ${scope}`,
      ux_mode: 'popup',
      login_hint: email,
      callback,
    });

    return new Promise((resolve, reject) => {
      resolveHook = resolve;
      rejectHook = reject;

      authClient.requestCode();
    });
  };

  const requestToken = async (): Promise<AuthorizationInfo> => {
    const googleAuthStore = useGoogleAuthStore();
    // check if the token has not yet expired
    if (
      googleAuthStore.authorizationInfo.expiry > (
        Date.now() + tokenTTLToleranceSec
      )
    ) {
      return googleAuthStore.authorizationInfo;
    }

    const userStore = useUserStore();
    if (!userStore.isAuthenticated || !userStore.user?.email) {
      return Promise.reject(new Error('User is not authenticated'));
    }

    // the token can expire so it must be refreshed here
    const idToken = await userStore.user.getIdToken(true);
    // try to get the new access token from the server
    let response = await $fetch<AccessTokenReturnType>('/api/auth', {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'x-id-token': idToken,
      },
    });

    console.log(response);

    if (response.valid && response.accessToken && response.expiry) {
      googleAuthStore.authorizationInfo = {
        accessToken: response.accessToken,
        expiry: response.expiry,
      };
      return googleAuthStore.authorizationInfo;
    }

    if (!response.valid && response.needsConsent) {
      // user needs to authorize the app
      const code = await getAuthCode(userStore.user.email);

      response = await $fetch<AccessTokenReturnType>('/api/auth', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          'x-id-token': idToken,
        },
        body: { code },
      });

      console.log('additional response', response);

      if (response.valid && response.accessToken && response.expiry) {
        googleAuthStore.authorizationInfo = {
          accessToken: response.accessToken,
          expiry: response.expiry,
        };
        return googleAuthStore.authorizationInfo;
      }
    }

    throw new Error(response.reason ?? 'Failed to get access token');
  };

  return {
    requestToken,
  };
};
