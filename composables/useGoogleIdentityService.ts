import type { UniversalAuthClient, UniversalAuthClientParams } from '~/models/types';
import { useImplicitGrantFlowAuth } from '~/composables/useImplicitGrantFlowAuth';

export type AuthFlowModel = 'implicitGrantFlow' | 'authorizationCodeFlow';
let chosenModel: AuthFlowModel = 'implicitGrantFlow';
const client = shallowRef<UniversalAuthClient | null>(null);

export const useGoogleIdentityService = (model: AuthFlowModel, params: UniversalAuthClientParams) => {
  const { scriptLoaded } = useGsiScript();
  watchEffect(() => {
    if (!scriptLoaded.value) {
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
