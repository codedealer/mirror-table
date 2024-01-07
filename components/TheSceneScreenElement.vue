<script setup lang="ts">
import { TableModes } from '~/models/types';
import type { DriveAsset, DriveImage, SceneElementScreen } from '~/models/types';

const props = defineProps<{
  item: SceneElementScreen
}>();

const tableStore = useTableStore();
const sceneStore = useSceneStore();

const isEditable = computed(() => {
  return tableStore.mode === TableModes.OWN;
});

const { file, isLoading: fileIsLoading } = useDriveFile<DriveAsset>(
  toRef(() => props.item.file),
  {
    strategy: DataRetrievalStrategies.RECENT,
    predicate: isDriveAsset,
  },
);

const { media: contentObject } = useDriveMedia(file);

const { file: imageFile, isLoading: imageIsLoading } = useDriveFile<DriveImage>(
  toRef(() => props.item.thumbnail ?? ''),
  {
    strategy: DataRetrievalStrategies.LAZY,
  },
);

const { media: imageObject } = useDriveMedia(imageFile);

const { src } = useMediaImageSrc(imageObject);

const isLoading = computed(() => {
  return fileIsLoading.value || imageIsLoading.value;
});

const toggleEnabled = () => {
  if (!isEditable.value) {
    return;
  }

  sceneStore.updateElement(props.item.id, {
    enabled: !props.item.enabled,
  });
};
</script>

<template>
  <div class="title-screen">
    <div class="title-screen__controls">
      <div class="title-screen__controls__status">
        <va-icon
          v-show="isLoading"
          name="sync"
          color="primary"
          size="medium"
          spin
        />

        <va-button
          v-show="!isLoading && isEditable"
          :disabled="isLoading"
          :icon="item.enabled ? 'visibility' : 'visibility_off'"
          :color="item.enabled ? 'primary' : 'warning'"
          preset="plain"
          size="large"
          @click="toggleEnabled"
        >
          {{ item.enabled ? '' : 'Screen is hidden' }}
        </va-button>
      </div>
      <div v-show="isEditable" class="title-screen__controls__actions">
        <va-button
          :disabled="!isEditable"
          :loading="isLoading"
          :icon="isLoading ? 'loading' : 'close'"
          color="text-primary"
          preset="plain"
          size="large"
          @click="sceneStore.removeElement(props.item)"
        />
      </div>
    </div>
    <div class="title-screen__content">
      <div
        v-if="imageFile"
        class="title-screen__content__image"
      >
        <DriveThumbnail
          :src="src"
          :file-is-loading="!src"
          fit="contain"
          :width="imageFile.imageMediaMetadata.width ?? 32"
          :height="imageFile.imageMediaMetadata.height ?? 32"
          :class="contentObject && contentObject.data ? 'title-screen__content__image--with-text' : ''"
        />
      </div>
      <div class="title-screen__content__text">
        <MarkdownRenderer
          :source="contentObject?.data ?? ''"
        />
      </div>
    </div>
    <div class="title-screen__status" />
  </div>
</template>

<style scoped lang="scss">

</style>
