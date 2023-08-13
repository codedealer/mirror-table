import type { MaybeRef, Ref } from 'vue';
import type { DriveFile } from '~/models/types';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const fieldMask = 'id, trashed, name, originalFilename, mimeType, shared, isAppAuthorized, imageMediaMetadata, createdTime, modifiedTime, fileExtension, properties, appProperties, md5Checksum, version, videoMediaMetadata, thumbnailLink, permissionIds, size, quotaBytesUsed, capabilities' as const;

export const useDriveFile = (id: MaybeRef<string | null>): Ref<DriveFile | null> => {
  const driveStore = useDriveStore();
  const { isReady } = toRefs(driveStore);

  const file = ref<DriveFile | null>(null);
  const idRef = ref(id);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watchEffect(async () => {
    console.log(`watching: id: ${idRef.value}, ready: ${isReady.value}`);
    if (!isReady.value || !idRef.value) {
      return;
    }

    try {
      const client = await driveStore.getClient();
      const response = await client.drive.files.get({
        fileId: idRef.value,
        fields: fieldMask,
      });

      file.value = response.result as DriveFile;
    } catch (e) {
      file.value = null;
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }
  });

  return file;
};
