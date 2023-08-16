import type { MaybeRef } from 'vue';
import type { DriveFile } from '~/models/types';

export const useDriveFileValidator = (file: MaybeRef<DriveFile | null>) => {
  const fileRef = ref(file);

  const canDownloadError = computed(() => {
    if (!fileRef.value) {
      return null;
    }

    if (
      fileRef.value.capabilities?.canDownload &&
      fileRef.value.isAppAuthorized &&
      fileRef.value.shared
    ) {
      return null;
    }

    return 'File is not shared or this app is not authorized to read it';
  });

  const isImageError = computed(() => {
    if (!fileRef.value) {
      return null;
    }

    if (
      fileRef.value.mimeType?.startsWith('image/') &&
      fileRef.value.imageMediaMetadata?.width &&
      fileRef.value.imageMediaMetadata?.height
    ) {
      return null;
    }

    return 'File is not a valid image';
  });

  return {
    fileRef,
    canDownloadError,
    isImageError,
  };
};
