<script setup lang="ts">
import type { DriveAsset, ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import { usePreviewImage } from '~/composables/usePreviewImage';

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

const {
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
  previewDimensions,
} = usePreviewImage(file, {
  activelyLoad: true,
  previewDimensionsConstraints: {
    width: 400,
    height: 400,
  },
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
