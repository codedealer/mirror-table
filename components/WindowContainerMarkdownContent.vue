<script setup lang="ts">
import type { DriveAsset, DriveImage, ModalWindow, ModalWindowContentMarkdown } from '~/models/types';

const props = defineProps<{
  window: ModalWindow
}>();

const windowContent = computed(() =>
  props.window.content as ModalWindowContentMarkdown,
);

const { file } = useDriveFile<DriveAsset>(
  ref(props.window.id),
  {
    appPropertiesType: AppPropertiesTypes.ASSET,
  },
);

const imageFileId = ref('');
const { file: imageFile, isLoading: imageLoading, error: imageError } = useDriveFile<DriveImage>(imageFileId, {
  activelyLoad: true,
});

// update the image id when the file changes
watchEffect(() => {
  if (!file.value) {
    return;
  }

  if (
    file.value.appProperties.kind !== AssetPropertiesKinds.TEXT &&
      file.value.appProperties.preview
  ) {
    imageFileId.value = file.value.appProperties.preview.id;
  }
});

const previewDimensions = computed(() => {
  if (!file.value || !file.value.appProperties.preview) {
    return {
      width: 200,
      height: 200,
    };
  }

  const maxWidth = 400;
  const maxHeight = 400;
  const { nativeWidth, nativeHeight } = file.value.appProperties.preview;
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
</script>

<template>
  <div class="window-container-markdown__content-grid">
    <div
      v-if="file?.appProperties?.preview"
      class="window-container-markdown__preview"
    >
      <DriveThumbnail
        :file="imageFile"
        :error="imageError"
        :file-is-loading="imageLoading"
        :width="previewDimensions.width"
        :height="previewDimensions.height"
        fit="contain"
        @error="console.error"
      />
    </div>

    <WindowContainerMarkdownRenderer
      v-show="!window.content.editing"
      :source="windowContent.data"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
