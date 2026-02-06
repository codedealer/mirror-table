import type { AuthorizationInfo } from '~/models/types';
import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';

export const useDriveStore = defineStore('drive', () => {
  const { isLoading, isReady: libLoaded, client } = useDrive();

  const googleStore = useGoogleAuthStore();
  const cacheStore = useCacheStore();

  void cacheStore.open();

  const isReady = computed(() => (
    libLoaded.value
    && !!client.value
    && !!googleStore.client
    && (cacheStore.isPersistenceSupported ? !!cacheStore.db : true)
  ),
  );

  const tokenRequest = ref<Promise<AuthorizationInfo> | null>(null);

  const lastSetAccessToken = ref<string>('');

  const getAuthorizationInfo = async (): Promise<AuthorizationInfo> => {
    if (!googleStore.client) {
      throw new Error('Google Auth Client not initialized when accessing Google Drive API');
    }

    try {
      if (!tokenRequest.value) {
        tokenRequest.value = googleStore.client.requestToken();
      }

      return await tokenRequest.value;
    } finally {
      tokenRequest.value = null;
    }
  };

  const augmentWithTokenAndGet = async (client: typeof gapi.client) => {
    const authInfo = await getAuthorizationInfo();

    // Avoid redundant setToken() calls during rapid reactivity churn.
    // requestToken() already handles expiry internally; we only update gapi when the token value changes.
    if (authInfo.accessToken && authInfo.accessToken !== lastSetAccessToken.value) {
      client.setToken({
        access_token: authInfo.accessToken,
      });
      lastSetAccessToken.value = authInfo.accessToken;
    }

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

    const authInfo: AuthorizationInfo = noTokenAugment
      ? googleStore.authorizationInfo
      : await getAuthorizationInfo();

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
    getAuthorizationInfo,
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
