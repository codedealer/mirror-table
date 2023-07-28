/// <reference path="../node_modules/vue3-google-signin/dist/@types/globals.d.ts" />
import type { TokenResponse } from 'vue3-google-signin';
import type { Ref } from 'vue';
import type { AuthorizationInfo, UniversalAuthClient } from '~/models/types';
import { expiryFromSeconds } from '~/utils';

export const useGoogleIdentityService = () => {
  const g = window.google;
  if (!g) {
    throw new Error('Trying to use Google Identity Service when it is not loaded');
  }

  const config = useRuntimeConfig();
  const oauth2 = g.accounts.oauth2;

  const implicitGrantModel = (
    storage: Ref<AuthorizationInfo>,
    scope: string = '',
  ): UniversalAuthClient => {
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

      console.log('callback got token: ', ai);
      storage.value = ai;

      resolveHook && resolveHook(ai);
    };

    const authClient = oauth2.initTokenClient({
      client_id: config.public.clientId,
      scope,
      callback,
    });

    const requestToken = (): Promise<AuthorizationInfo> => {
      // check if the token has not yet expired
      if (storage.value && storage.value.expiry > Date.now()) {
        return Promise.resolve(storage.value);
      }

      return new Promise((resolve, reject) => {
        resolveHook = resolve;
        rejectHook = reject;

        authClient.requestAccessToken();
      });
    };

    return {
      storage,
      requestToken,
    };
  };

  return {
    implicitGrantModel,
  };
};
