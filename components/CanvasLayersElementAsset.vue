<script setup lang="ts">
import type { ContextAction, DriveImage, LayerItem, SceneElementCanvasObjectAsset } from '~/models/types';
import { useCanvasAssetProperties } from '~/composables/useCanvasAssetProperties';
import { useCanvasElementAssetLabel } from '~/composables/useCanvasElementAssetLabel';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const props = defineProps<{
  item: LayerItem<SceneElementCanvasObjectAsset>;
}>();

const { properties } = useCanvasAssetProperties(
  toRef(() => props.item.item),
);

const isComplexTrashed = computed(() => {
  return properties.value.kind === AssetPropertiesKinds.COMPLEX
    && properties.value.settings?.trashed === true;
});

const label = computed(() => {
  return properties.value.title ?? '[no data]';
});

const { file: image, isLoading: imageLoading, error: imageError } = useDriveFile<DriveImage>(
  toRef(() => properties.value.preview.id),
  {
    strategy: DataRetrievalStrategies.LAZY,
  },
);

const canvasElementsStore = useCanvasElementsStore();

const restoreLoading = ref(false);
const restoreFromTrash = async () => {
  if (!isComplexTrashed.value) {
    return;
  }

  try {
    restoreLoading.value = true;

    const driveFileStore = useDriveFileStore();
    await driveFileStore.removeFile(properties.value.id, true);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
    console.error(e);
  } finally {
    restoreLoading.value = false;
  }
};

const select = () => {
  if (isComplexTrashed.value) {
    return;
  }
  canvasElementsStore.selectElement(props.item.id);
};

const isSelected = computed(() => {
  return canvasElementsStore.selectedElements.findIndex(e => e.id === props.item.id) !== -1;
});

const { label: elementLabel, isVisible } = useCanvasElementAssetLabel(
  toRef(() => props.item.item),
);

const contextActions = ref<ContextAction[]>([]);

watchEffect(() => {
  if (isComplexTrashed.value) {
    contextActions.value = [];
    return;
  }

  contextActions.value = CanvasAssetContextActionsFactory(props.item.id);
});
</script>

<template>
  <va-list-item
    :class="{ active: isSelected && !imageLoading && !isComplexTrashed }"
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
        v-show="imageError"
      >
        {{ extractErrorMessage(imageError) }}
      </va-list-item-label>
      <va-list-item-label
        v-show="!imageError"
        caption
        :title="isVisible ? elementLabel : label"
        :class="isComplexTrashed ? 'layer-label--trashed' : ''"
      >
        {{ isVisible ? elementLabel : label }}
      </va-list-item-label>
    </va-list-item-section>
    <va-list-item-section icon>
      <va-popover
        message="Restore"
        stick-to-edges
      >
        <va-button
          v-show="isComplexTrashed"
          :loading="restoreLoading"
          preset="plain"
          color="primary-dark"
          size="medium"
          icon="replay"
          @click.stop="restoreFromTrash"
        />
      </va-popover>

      <ContextPanel
        v-show="!isComplexTrashed"
        :actions="contextActions"
      />
    </va-list-item-section>
  </va-list-item>
</template>

<style scoped lang="scss">
.layer-label--trashed {
  text-decoration: line-through;
  opacity: 0.8;
}
</style>
