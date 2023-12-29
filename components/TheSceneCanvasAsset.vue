<script setup lang="ts">
import type { ComputedRef } from 'vue';
import type Konva from 'konva';
import type {
  CanvasElementStateAsset, ElementContainerConfig, KonvaComponent,
  SceneElementCanvasObjectAsset,
} from '~/models/types';
import { isCanvasElementStateAsset } from '~/models/types';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';

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

const state = ref<CanvasElementStateAsset | undefined>();
watchEffect(() => {
  if (!(props.element.id in canvasElementsStore.canvasElementsStateRegistry)) {
    const stateObject: CanvasElementStateAsset = {
      _type: 'asset',
      id: props.element.id,
      loading: false,
      loaded: false,
      selectable: true,
      selected: false,
    };

    canvasElementsStore.canvasElementsStateRegistry[props.element.id] = stateObject;
  }

  const stateObject = canvasElementsStore.canvasElementsStateRegistry[props.element.id];

  if (!isCanvasElementStateAsset(stateObject)) {
    updateState({
      error: new Error(`Invalid state for asset ${props.element.id}`),
    });
    state.value = undefined;

    return;
  }

  updateState({ error: undefined });

  state.value = stateObject;
});

const container = ref<KonvaComponent<Konva.Group> | null>(null);

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
    y: 0,
    offsetX: props.element.asset.preview.nativeWidth / 2,
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
    ref="container"
    :config="containerConfig"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
  >
    <v-circle v-if="!imageConfig" :config="circleConfig" />
    <v-image v-else :config="imageConfig" />
    <TheSceneCanvasAssetLabel
      v-if="imageConfig && !state?.error"
      :element="element"
    />
  </v-group>
</template>

<style scoped lang="scss">

</style>
