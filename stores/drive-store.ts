import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';
import { hasKey } from '~/models/types';

export const useDriveStore = defineStore('drive', () => {
  const { isLoading, isReady, client } = useDrive();

  const googleStore = useGoogleAuthStore();

  const augmentWithTokenAndGet = async (client: typeof gapi.client): Promise<typeof gapi.client.drive> => {
    if (!googleStore.client) {
      throw new Error('Google Auth Client not initialized when accessing Google Drive API');
    }

    const authInfo = await googleStore.client.requestToken();

    client.setToken({
      access_token: authInfo.accessToken,
    });

    return Reflect.get(client, 'drive');
  };

  const proxiedClient = computed(() => {
    if ((!googleStore.client || !client.value)) {
      return null;
    }

    return new Proxy(client.value, {
      get (target, prop, receiver) {
        if (prop === 'drive') {
          return augmentWithTokenAndGet(target);
        }

        return hasKey(target, prop) ? Reflect.get(target, prop, receiver) : undefined;
      },
    });
  });

  return {
    isLoading: skipHydrate(isLoading),
    isReady: skipHydrate(isReady),
    client: proxiedClient,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useDriveStore, import.meta.hot),
  );
}
