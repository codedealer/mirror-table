import type { Ref } from 'vue';
import type { DataRetrievalStrategy, DriveAsset, DriveImage } from '~/models/types';

export interface PreviewImageOptions {
  strategy?: DataRetrievalStrategy
  previewDimensionsConstraints?: {
    width: number
    height: number
  }
}

export const usePreviewImage = (
  asset: Ref<DriveAsset | undefined>,
  options: PreviewImageOptions = {
    strategy: DataRetrievalStrategies.SOURCE,
    previewDimensionsConstraints: {
      width: 300,
      height: 300,
    },
  },
) => {
  const imageFileId = ref('');

  const { file, isLoading, error } = useDriveFile<DriveImage>(imageFileId, {
    strategy: options.strategy ?? DataRetrievalStrategies.SOURCE,
  });

  watchEffect(() => {
    if (!asset.value) {
      return;
    }

    if (
      asset.value.appProperties.kind !== AssetPropertiesKinds.TEXT &&
      asset.value.appProperties.preview
    ) {
      imageFileId.value = asset.value.appProperties.preview.id;
    }
  });

  const maxWidth = options?.previewDimensionsConstraints?.width ?? 300;
  const maxHeight = options?.previewDimensionsConstraints?.height ?? 300;
  const previewDimensions = computed(() => {
    if (!asset.value || !asset.value.appProperties.preview) {
      return {
        width: maxWidth,
        height: maxHeight,
      };
    }
    const { nativeWidth, nativeHeight } = asset.value.appProperties.preview;
    const nativeRatio = aspectRatio(nativeWidth, nativeHeight);

    if (nativeWidth <= maxWidth && nativeHeight <= maxHeight) {
      return {
        width: nativeWidth,
        height: nativeHeight,
      };
    }

    if (nativeRatio > 1) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / nativeRatio),
      };
    }

    return {
      width: Math.round(maxHeight * nativeRatio),
      height: maxHeight,
    };
  });

  return {
    imageFileId,
    file,
    isLoading,
    error,
    previewDimensions,
  };
};
