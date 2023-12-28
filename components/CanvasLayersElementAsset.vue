<script setup lang="ts">
import type { DriveAsset, DriveImage, LayerItem, SceneElementCanvasObjectAsset } from '~/models/types';

const props = defineProps<{
  item: LayerItem<SceneElementCanvasObjectAsset>
}>();

const { file, label, isLoading, error } = useDriveFile<DriveAsset>(
  toRef(() => props.item.item.asset.id),
  {
    strategy: DataRetrievalStrategies.LAZY,
    predicate: isDriveAsset,
  },
);

const { file: image, isLoading: imageLoading } = useDriveFile<DriveImage>(
  toRef(() => props.item.item.asset.preview.id),
  {
    strategy: DataRetrievalStrategies.LAZY,
  },
);
</script>

<template>
  <va-list-item
    :disabled="isLoading || !!error"
    class="layer-element"
  >
    <va-list-item-section avatar>
      <DriveThumbnail
        :file="image"
        :file-is-loading="imageLoading"
        width="48"
        height="48"
        fit="cover"
      />
    </va-list-item-section>
    <va-list-item-section>
      <va-list-item-label
        v-show="error"
      >
        {{ extractErrorMessage(error) }}
      </va-list-item-label>
      <va-list-item-label
        v-show="!error"
        caption
      >
        {{ file?.appProperties.showTitle ? file?.appProperties.title : label }}
      </va-list-item-label>
    </va-list-item-section>
  </va-list-item>
</template>

<style scoped lang="scss">

</style>
