<script setup lang="ts">
import type { ComputedRef } from 'vue';
import type Konva from 'konva';
import type {
  CanvasElementStateAsset, ElementContainerConfig,
  SceneElementCanvasObjectAsset,
} from '~/models/types';
import { isCanvasElementStateAsset } from '~/models/types';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';

const props = defineProps<{
  element: SceneElementCanvasObjectAsset
}>();

// create a stateful object
const canvasElementsStore = useCanvasElementsStore();
// should this watch the element id?
const stateObject: CanvasElementStateAsset = {
  _type: 'asset',
  id: props.element.id,
  loading: false,
  loaded: false,
  selectable: true,
  selected: false,
};

canvasElementsStore.canvasElementsStateRegistry[props.element.id] = stateObject;

const updateState = (partialState: Partial<CanvasElementStateAsset>) => {
  canvasElementsStore.updateElementState<CanvasElementStateAsset>(
    props.element.id,
    partialState,
  );
};

// TODO: should be a watchEffect
const state = computed(() => {
  if (!(props.element.id in canvasElementsStore.canvasElementsStateRegistry)) {
    return;
  }

  const state = canvasElementsStore.canvasElementsStateRegistry[props.element.id];

  if (!isCanvasElementStateAsset(state)) {
    updateState({
      error: new Error(`Invalid state for asset ${props.element.id}`),
    });
    return;
  }

  updateState({ error: undefined });

  return state;
});

const imageConfig: ComputedRef<Konva.ImageConfig | null> = computed(() => {
  if (!state.value || !state.value.imageElement) {
    return null;
  }

  return {
    image: state.value.imageElement,
  };
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

const driveFileStore = useDriveFileStore();

updateState({
  loading: true,
});

try {
  const mediaObject = await driveFileStore.downloadMedia(props.element.asset.preview.id);
  if (!mediaObject) {
    throw new Error(`Failed to download media for asset ${props.element.asset.preview.id}`);
  }

  const blob = convertToBlob(mediaObject);
  const src = URL.createObjectURL(blob);
  const image = new Image();
  image.src = src;

  updateState({
    imageElement: image,
    loaded: true,
  });
} catch (e) {
  console.error(e);
  const notificationStore = useNotificationStore();
  notificationStore.error(extractErrorMessage(e));

  updateState({
    error: e,
  });
} finally {
  updateState({
    loading: false,
  });
}

onUnmounted(() => {
  if (!state.value || !state.value.imageElement) {
    return;
  }

  URL.revokeObjectURL(state.value.imageElement.src);

  canvasElementsStore.deleteState(props.element.id);
});

const circleConfig = ref({
  x: 100,
  y: 100,
  radius: 50,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 4,
});

const { onNodeTransformEnd } = useCanvasTransformEvents();
</script>

<template>
  <v-group
    :config="containerConfig"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
  >
    <v-circle v-if="!imageConfig" :config="circleConfig" />
    <v-image v-else :config="imageConfig" />
  </v-group>
</template>

<style scoped lang="scss">

</style>
