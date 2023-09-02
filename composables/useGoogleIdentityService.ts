import type { UniversalAuthClient, UniversalAuthClientParams } from '~/models/types';
import { useImplicitGrantFlowAuth } from '~/composables/useImplicitGrantFlowAuth';
import { useAsyncScriptTag } from '~/composables/useAsyncScriptTag';

export type AuthFlowModel = 'implicitGrantFlow' | 'authorizationCodeFlow';

export const useGoogleIdentityService = (model: AuthFlowModel, params: UniversalAuthClientParams) => {
  const { ready } = useAsyncScriptTag('https://accounts.google.com/gsi/client');
  const client = shallowRef<UniversalAuthClient | null>(null);

  watchEffect(() => {
    if (!ready.value) {
      return;
    }

    if (model === 'implicitGrantFlow') {
      client.value = useImplicitGrantFlowAuth(params);
    } else if (model === 'authorizationCodeFlow') {
      client.value = useAuthCodeFlowAuth(params);
    }
  });

  return { client };
};
