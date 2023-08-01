/// <reference path="../node_modules/@types/gapi/index.d.ts" />
/// <reference path="../node_modules/@types/gapi.client.drive-v3/index.d.ts" />

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const API_SRC = 'https://apis.google.com/js/api.js';

export const useDrive = () => {
  const { init } = useToast();

  const driveApiLoaded = ref(false);
  const pickerApiLoaded = ref(false);
  const driveApiLoading = ref(false);
  const pickerApiLoading = ref(false);

  const isLoading = computed(() => driveApiLoading.value || pickerApiLoading.value);
  const isReady = computed(() => driveApiLoaded.value && pickerApiLoaded.value);
  const client = shallowRef<typeof gapi.client | null>(null);

  const loadDrive = async () => {
    try {
      await gapi.client.load(DISCOVERY_DOC);
    } catch (e) {
      driveApiLoading.value = false;

      console.error(e);
      init({
        message: 'Failed to load Google Drive API',
        color: 'danger',
      });
      return;
    }

    client.value = gapi.client;
    driveApiLoading.value = false;
    driveApiLoaded.value = true;
  };

  const { ready } = useAsyncScriptTag(API_SRC);

  driveApiLoading.value = true;
  pickerApiLoading.value = true;

  watchEffect(() => {
    if (!ready.value) {
      return;
    }

    // only proceed if gsi script is loaded
    // and gapi script is loaded
    gapi.load('client', {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      callback: loadDrive,
      onerror: () => {
        driveApiLoading.value = false;
        init({
          message: 'Failed to load Google API Client',
          color: 'danger',
        });
      },
    });

    // load picker
    gapi.load('picker', {
      callback: () => {
        pickerApiLoaded.value = true;
        pickerApiLoading.value = false;
      },
      onerror: () => {
        pickerApiLoading.value = false;
        init({
          message: 'Failed to load Google Picker API',
          color: 'danger',
        });
      },
    });
  });

  return {
    isLoading,
    isReady,
    client,
  };
};
