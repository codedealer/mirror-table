import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';
import type { AuthorizationInfo } from '~/models/types';

export const useDriveStore = defineStore('drive', () => {
  const { isLoading, isReady: libLoaded, client } = useDrive();

  const googleStore = useGoogleAuthStore();
  const cacheStore = useCacheStore();

  void cacheStore.open();

  const isReady = computed(() => (
    libLoaded.value &&
    !!client.value &&
    !!googleStore.client &&
    (cacheStore.isPersistenceSupported ? !!cacheStore.db : true)
  ),
  );

  const tokenRequest = ref<Promise<AuthorizationInfo> | null>(null);

  const augmentWithTokenAndGet = async (client: typeof gapi.client) => {
    if (!googleStore.client) {
      throw new Error('Google Auth Client not initialized when accessing Google Drive API');
    }

    let authInfo: AuthorizationInfo;
    try {
      if (tokenRequest.value) {
        console.warn('Requesting auth token while another request is in progress');
        authInfo = await tokenRequest.value;
      } else {
        tokenRequest.value = googleStore.client.requestToken();
        authInfo = await tokenRequest.value;
      }
    } finally {
      tokenRequest.value = null;
    }

    client.setToken({
      access_token: authInfo.accessToken,
    });

    return client;
  };

  const getClient = async (noTokenAugment = false) => {
    if (!client.value) {
      throw new Error('Google Drive API not initialized');
    }

    if (noTokenAugment) {
      return client.value;
    }

    return await augmentWithTokenAndGet(client.value);
  };

  const getPickerBuilder = async (noTokenAugment = false) => {
    if (!isReady) {
      throw new Error('Google Picker API not ready');
    }

    let authInfo: AuthorizationInfo = googleStore.authorizationInfo;
    if (!noTokenAugment) {
      authInfo = await googleStore.client!.requestToken();
    }

    const builder = new window.google.picker.PickerBuilder();
    const config = useRuntimeConfig();
    builder.setDeveloperKey(config.public.fbApiKey)
      .setAppId(config.public.clientId)
      .setOAuthToken(authInfo.accessToken)
    ;

    return builder;
  };

  const driveFolderModalStore = useDriveFolderModalStore();

  return {
    isLoading: skipHydrate(isLoading),
    isReady,
    getClient,
    getPickerBuilder,
    promptToCreateParentFolder: driveFolderModalStore.promptToCreateParentFolder,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useDriveStore, import.meta.hot),
  );
}
