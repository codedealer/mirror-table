<script setup lang="ts">
import type { DriveAsset, ModalWindow, RawMediaObject } from '~/models/types';
import { usePreviewImage } from '~/composables/usePreviewImage';

const props = defineProps<{
  window: ModalWindow
  media?: RawMediaObject
}>();

const { file } = useDriveFile<DriveAsset>(
  toRef(() => props.window.id),
  {
    strategy: DataRetrievalStrategies.OPTIMISTIC_CACHE,
    predicate: isDriveAsset,
  },
);

const {
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
  previewDimensions,
} = usePreviewImage(file, {
  strategy: DataRetrievalStrategies.RECENT,
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

    <MarkdownRenderer
      v-if="media"
      v-show="!window.content.editing"
      :source="media.data"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
