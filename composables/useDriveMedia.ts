import type { DataRetrievalStrategy, DriveFile, RawMediaObject } from '~/models/types';

export const useDriveMedia = (
  file: Ref<DriveFile | undefined>,
  mediaStrategy: DataRetrievalStrategy = DataRetrievalStrategies.LAZY,
  fileStrategy: DataRetrievalStrategy = DataRetrievalStrategies.RECENT,
) => {
  const media = ref<RawMediaObject | undefined>();
  const error = ref<unknown>();

  const loadMedia = async () => {
    // we skip image assets (they have no body) and matching checksums
    if (
      !file.value ||
      !file.value.md5Checksum ||
      file.value.loading ||
      (
        isAssetProperties(file.value.appProperties) &&
        file.value.appProperties.kind === AssetPropertiesKinds.IMAGE
      ) ||
      (
        file.value.id === media.value?.id &&
        file.value.md5Checksum === media.value?.md5Checksum
      )
    ) {
      return;
    }

    const driveFileStore = useDriveFileStore();

    try {
      error.value = undefined;

      const mediaObj = await driveFileStore.downloadMedia(
        file.value.id,
        mediaStrategy,
        fileStrategy,
      );

      if (!mediaObj) {
        throw new Error('Could not download file');
      }

      media.value = mediaObj;
    } catch (err) {
      console.error(err);
      error.value = err;
    }
  };

  watch(file, loadMedia, {
    immediate: true,
    deep: true,
  });

  return {
    media,
    error,
  };
};
