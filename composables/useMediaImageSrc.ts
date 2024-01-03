import type { RawMediaObject } from '~/models/types';

export const useMediaImageSrc = (
  media: Ref<RawMediaObject | undefined>,
) => {
  const src = ref<string | undefined>();
  const error = ref<unknown>();
  const md5Checksum = ref<string | undefined>();

  const resetSrc = () => {
    error.value = undefined;

    if (!src.value) {
      md5Checksum.value = undefined;
      return;
    }

    URL.revokeObjectURL(src.value);
    src.value = undefined;
    md5Checksum.value = undefined;
  };

  watch(media, (mediaObject) => {
    if (!mediaObject) {
      resetSrc();
      return;
    }

    // don't need to re-create the src if it's the same
    if (mediaObject.md5Checksum === md5Checksum.value) {
      return;
    }

    try {
      const blob = convertToBlob(mediaObject);

      src.value = URL.createObjectURL(blob);
      md5Checksum.value = mediaObject.md5Checksum;
      error.value = undefined;
    } catch (e) {
      console.error(e);
      error.value = e;
    }
  }, { immediate: true, deep: true });

  onUnmounted(resetSrc);

  return {
    src,
    error,
  };
};
