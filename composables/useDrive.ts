/// <reference path="../node_modules/@types/gapi/index.d.ts" />
/// <reference path="../node_modules/@types/gapi.client.drive-v3/index.d.ts" />

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

/* TODO: this should only initialize the drive client
 * and the auth client. On action we should check if we're authorized
 * and if the token hasn't expired.
 * The authorization should be done with the same account that has authenticated
 * with Firebase and with { prompt: 'none' }.
 */
export const useDrive = () => {
  const { init } = useToast();

  const isLoading = ref(false);
  const isReady = ref(false);
  const client = shallowRef<typeof gapi.client | null>(null);

  const loadDrive = async () => {
    try {
      await gapi.client.load(DISCOVERY_DOC);
    } catch (e) {
      isLoading.value = false;

      console.error(e);
      init({
        message: 'Failed to load Google Drive API',
        color: 'danger',
      });
      return;
    }

    client.value = gapi.client;
    isLoading.value = false;
    isReady.value = true;
  };

  onMounted(() => {
    isLoading.value = true;

    watchEffect(() => {
      if (!('gapi_loaded' in window) ||
        !window.gapi_loaded) {
        return;
      }

      // only proceed if gsi script is loaded
      // and gapi script is loaded
      gapi.load('client', {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        callback: loadDrive,
        onerror: () => {
          isLoading.value = false;
          init({
            message: 'Failed to load Google API Client',
            color: 'danger',
          });
        },
      });
    });
  });

  return {
    isLoading: readonly(isLoading),
    isReady: readonly(isReady),
    client,
  };
};
