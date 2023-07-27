/// <reference path="../node_modules/@types/gapi/index.d.ts" />
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

export const useDrive = () => {
  const userStore = useUserStore();
  const { init } = useToast();
  const initializeGapi = () => {
    const loadDrive = async () => {
      try {
        await gapi.client.load(DISCOVERY_DOC);
        console.log(`setting auth token ${userStore.idToken}`);
        gapi.client.setToken({
          access_token: userStore.idToken as string,
        });
      } catch (e) {
        console.error(e);
        init({
          message: 'Failed to load Google Drive API',
          color: 'danger',
        });
        return;
      }

      const fileMetadata = {
        name: 'test.txt',
        parents: ['appDataFolder'],
      };
      const media = {
        mimeType: 'text/plain',
        body: 'Hello World',
      };
      try {
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const res = await gapi.client.drive.files.create({
          resource: fileMetadata,
          media,
          fields: 'id',
        });
        console.log(res);
      } catch (e) {
        console.log(e);
      }
    };
    gapi.load('client', {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      callback: loadDrive,
      onerror: () => {
        init({
          message: 'Failed to load Google Drive API',
          color: 'danger',
        });
      },
    });
  };
  onMounted(() => {
    watchEffect(() => {
      if (!userStore.authInitialized ||
        !('gapi_loaded' in window) ||
        !window.gapi_loaded) {
        return;
      }

      // only proceed if user is confirmed to be logged in
      // and gapi script is loaded
      void initializeGapi();
    });
  });
};
