import type { Ref } from 'vue';
import type { DataRetrievalStrategy, DriveAsset, DriveImage, PreviewProperties } from '~/models/types';

export interface PreviewImageOptions {
  strategy?: DataRetrievalStrategy
  previewDimensionsConstraints?: {
    width: number
    height: number
  }
}

export const usePreviewImage = (
  assetOrPreviewProps: Ref<DriveAsset | PreviewProperties | null | undefined>,
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
    if (!assetOrPreviewProps.value) {
      return;
    }

    if ('appProperties' in assetOrPreviewProps.value) {
      const asset = assetOrPreviewProps.value;
      if (
        asset.appProperties.kind !== AssetPropertiesKinds.TEXT &&
        asset.appProperties.preview
      ) {
        imageFileId.value = asset.appProperties.preview.id;
      }
    } else if ('id' in assetOrPreviewProps.value) {
      imageFileId.value = assetOrPreviewProps.value.id;
    }
  });

  const maxWidth = options?.previewDimensionsConstraints?.width ?? 300;
  const maxHeight = options?.previewDimensionsConstraints?.height ?? 300;
  const previewDimensions = computed(() => {
    if (!assetOrPreviewProps.value) {
      return {
        width: maxWidth,
        height: maxHeight,
      };
    }
    if ('appProperties' in assetOrPreviewProps.value && !assetOrPreviewProps.value.appProperties.preview) {
      return {
        width: maxWidth,
        height: maxHeight,
      };
    }
    const { nativeWidth, nativeHeight } = 'appProperties' in assetOrPreviewProps.value
      ? assetOrPreviewProps.value.appProperties.preview!
      : assetOrPreviewProps.value;
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
