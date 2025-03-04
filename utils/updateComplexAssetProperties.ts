import type { AssetProperties } from '~/models/types';

const updateComplexAssetProperties = async (fileId: string, properties: AssetProperties) => {
  const driveFileStore = useDriveFileStore();

  try {
    await driveFileStore.saveFile(fileId, properties);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
    console.error(e);
  }
};

export default updateComplexAssetProperties;
