<script setup lang="ts">
import type { ContextAction, DriveAsset, DriveImage, LayerItem, SceneElementScreen } from '~/models/types';

const props = defineProps<{
  item: LayerItem<SceneElementScreen>
}>();

const { label, isLoading, error, file } = useDriveFile<DriveAsset>(
  toRef(() => props.item.item.file),
  {
    strategy: DataRetrievalStrategies.LAZY,
    predicate: isDriveAsset,
  },
);

const { file: image, isLoading: imageLoading } = useDriveFile<DriveImage>(
  toRef(() => props.item.item.thumbnail ?? ''),
  {
    strategy: DataRetrievalStrategies.LAZY,
  },
);

const contextActions = ref<ContextAction[]>([]);

watchEffect(() => {
  contextActions.value = CanvasAssetContextActionsFactory(props.item.id);
});
</script>

<template>
  <va-list-item
    :disabled="isLoading || !!error"
    class="layer-element"
    href="#"
  >
    <va-list-item-section avatar>
      <DriveThumbnail
        v-if="props.item.item.thumbnail"
        :file="image"
        :file-is-loading="imageLoading"
        width="48"
        height="48"
        fit="cover"
      />

      <DriveDirectoryTreeFileIcon
        v-else
        :file="file"
        :error="error"
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
        {{ label }}
      </va-list-item-label>
    </va-list-item-section>
    <va-list-item-section icon>
      <ContextPanel
        :actions="contextActions"
      />
    </va-list-item-section>
  </va-list-item>
</template>

<style scoped lang="scss">

</style>
