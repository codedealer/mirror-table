<script setup lang="ts">
import type { DriveAsset, DriveImage, LayerItem, SceneElementCanvasObjectAsset } from '~/models/types';
import { useCanvasElementAssetLabel } from '~/composables/useCanvasElementAssetLabel';

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

const sceneStore = useSceneStore();
const canvasElementsStore = useCanvasElementsStore();

const select = () => {
  canvasElementsStore.selectElement(props.item.id);
};

const isSelected = computed(() => {
  return canvasElementsStore.selectedElements.findIndex(e => e.id === props.item.id) !== -1;
});

const elementLabel = useCanvasElementAssetLabel(
  toRef(() => props.item.item),
  file,
  label,
);
</script>

<template>
  <va-list-item
    :disabled="isLoading || !!error"
    :class="{ active: isSelected && !isLoading }"
    class="layer-element"
    href="#"
    @click="select"
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
        {{ elementLabel }}
      </va-list-item-label>
    </va-list-item-section>
    <va-list-item-section icon>
      <va-button
        v-show="!isLoading"
        icon="delete"
        color="danger"
        preset="plain"
        size="small"
        @click.stop="sceneStore.removeElement(item.item)"
      />
    </va-list-item-section>
  </va-list-item>
</template>

<style scoped lang="scss">

</style>
