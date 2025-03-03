import type { AssetProperties } from '~/models/types';

const updateComplexAssetProperties = async (fileId: string, properties: AssetProperties) => {
  const driveFileStore = useDriveFileStore();

  // ensure the file is loaded
  if (!driveFileStore.files[fileId]) {
    try {
      await driveFileStore.getFile(fileId);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
      console.error(e);
    }
  }

  // assume the file is loaded
  try {
    await driveFileStore.saveFile(fileId, properties);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
    console.error(e);
  }
};

export default updateComplexAssetProperties;
