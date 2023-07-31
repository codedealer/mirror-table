import type { UniversalAuthClient, UniversalAuthClientParams } from '~/models/types';
import { useImplicitGrantFlowAuth } from '~/composables/useImplicitGrantFlowAuth';
import { useAsyncScriptTag } from '~/composables/useAsyncScriptTag';

export type AuthFlowModel = 'implicitGrantFlow' | 'authorizationCodeFlow';
let chosenModel: AuthFlowModel = 'implicitGrantFlow';
const client = shallowRef<UniversalAuthClient | null>(null);

export const useGoogleIdentityService = (model: AuthFlowModel, params: UniversalAuthClientParams) => {
  const { ready } = useAsyncScriptTag('https://accounts.google.com/gsi/client');
  watchEffect(() => {
    if (!ready.value) {
      return;
    }

    if (client.value && model === chosenModel) {
      return { client };
    }

    chosenModel = model;
    if (model === 'implicitGrantFlow') {
      client.value = useImplicitGrantFlowAuth(params);
    } else if (model === 'authorizationCodeFlow') {
      throw new Error('Authorization Code Flow is not yet implemented');
    }
  });

  return { client };
};
