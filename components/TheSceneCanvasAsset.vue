<script setup lang="ts">
import type { ComputedRef } from 'vue';
import type Konva from 'konva';
import type {
  CanvasElementStateAsset,
  DriveImage,
  ElementContainerConfig,
  SceneElementCanvasObjectAsset,
} from '~/models/types';
import { isCanvasElementStateAsset } from '~/models/types';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';
import { useCanvasAssetPointerEvents } from '~/composables/useCanvasAssetPointerEvents';

const props = defineProps<{
  element: SceneElementCanvasObjectAsset
}>();

// create a stateful object
const canvasElementsStore = useCanvasElementsStore();

const updateState = (partialState: Partial<CanvasElementStateAsset>) => {
  canvasElementsStore.updateElementState<CanvasElementStateAsset>(
    props.element.id,
    partialState,
  );
};

const state = ref<CanvasElementStateAsset | undefined>(undefined);

const { canvasElementsStateRegistry } = storeToRefs(canvasElementsStore);

watch(() => canvasElementsStateRegistry.value[props.element.id], (stateObject) => {
  if (!stateObject || !isCanvasElementStateAsset(stateObject)) {
    canvasElementsStore.createAssetState(props.element.id);

    state.value = undefined;
    return;
  }

  state.value = stateObject;
}, {
  immediate: true,
  deep: true,
});

const layersStore = useLayersStore();
watch(() => props.element.selectionGroup, (group) => {
  if (!state.value) {
    return;
  }

  updateState({
    selectable: layersStore.activeGroups[group] === true,
    selected: false,
  });
});

const { file: imageFile } = useDriveFile<DriveImage>(
  toRef(() => props.element.asset.preview.id),
  {
    strategy: DataRetrievalStrategies.LAZY,
  },
);

const { media: imageObject } = useDriveMedia(imageFile);

const { src } = useMediaImageSrc(imageObject);

watch(src, () => {
  if (!src.value) {
    return;
  }

  const imageElement = new Image();
  imageElement.src = src.value;

  updateState({
    loading: false,
    loaded: true,
    imageElement,
  });
}, {
  immediate: true,
});

const containerConfig: ComputedRef<ElementContainerConfig> = computed(() => {
  if (!state.value) {
    return props.element.container;
  }

  return {
    ...props.element.container,
    draggable: state.value?.selectable && state.value?.selected,
  };
});

const imageConfig: ComputedRef<Konva.ImageConfig | null> = computed(() => {
  if (!state.value || !state.value.imageElement) {
    return null;
  }

  return {
    image: state.value.imageElement,
    width: props.element.asset.preview.nativeWidth,
    height: props.element.asset.preview.nativeHeight,
    x: containerConfig.value.width / 2,
    y: containerConfig.value.height / 2,
    offsetX: props.element.asset.preview.nativeWidth / 2,
    offsetY: props.element.asset.preview.nativeHeight / 2,
    opacity: props.element.enabled ? 1 : 0.5,
  };
});

const loadingRect = computed(() => {
  return {
    x: 0,
    y: 0,
    width: containerConfig.value.width,
    height: containerConfig.value.height,
    fill: '#444',
    opacity: 0.5,
  };
});

const tableStore = useTableStore();

const showLoading = computed(() => {
  return tableStore.mode === TableModes.OWN && (!state.value || !state.value.loaded);
});

onUnmounted(() => {
  if (!state.value || !state.value.imageElement) {
    return;
  }

  URL.revokeObjectURL(state.value.imageElement.src);

  canvasElementsStore.deleteState(props.element.id);
});

useCanvasAssetLabelWatcher(toRef(() => props.element));

const { onNodeTransformEnd } = useCanvasTransformEvents();

const { onHover, onHoverOut } = useCanvasAssetPointerEvents(state);

const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  onNodeTransformEnd(e);
  onHover(e);
};

const onTransformEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  onNodeTransformEnd(e);
  onHover(e);
};
</script>

<template>
  <v-group
    :config="containerConfig"
    @dragstart="onHoverOut"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
    @transformstart="onHoverOut"
    @pointerover="onHover"
    @pointerout="onHoverOut"
  >
    <v-rect v-if="showLoading" :config="loadingRect" />

    <v-image v-if="imageConfig" :config="imageConfig" />

    <TheSceneCanvasAssetLabel
      v-if="imageConfig"
      :element="element"
    />
  </v-group>
</template>

<style scoped lang="scss">

</style>
