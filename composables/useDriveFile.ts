import type { MaybeRef } from 'vue';
import type { DriveFile } from '~/models/types';
import { extractErrorMessage } from '~/utils/extractErrorMessage';
import { fieldMask } from '~/models/types';

export const useDriveFile = (id: MaybeRef<string | null>) => {
  const driveStore = useDriveStore();
  const { isReady } = toRefs(driveStore);

  const file = shallowRef<DriveFile | null>(null);
  const error = shallowRef<unknown>(null);
  const isLoading = ref(false);
  const idRef = ref(id);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watchEffect(async () => {
    if (!isReady.value || !idRef.value) {
      error.value = null;
      file.value = null;
      isLoading.value = false;
      return;
    }

    error.value = null;
    isLoading.value = true;

    try {
      const client = await driveStore.getClient();
      const response = await client.drive.files.get({
        fileId: idRef.value,
        fields: fieldMask,
      });

      file.value = response.result as DriveFile;
    } catch (e) {
      file.value = null;
      error.value = e;

      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      isLoading.value = false;
    }
  });

  return { file, error, isLoading };
};
