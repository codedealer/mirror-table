<script setup lang="ts">
import type { ComputedRef } from 'vue';
import type Konva from 'konva';
import type {
  CanvasElementStateAsset,
  SceneElementCanvasObjectAsset,
  Stateful,
} from '~/models/types';

const props = defineProps<{
  element: Stateful<SceneElementCanvasObjectAsset, CanvasElementStateAsset>
}>();

const imageConfig: ComputedRef<Konva.ImageConfig | null> = computed(() => {
  if (!props.element._state.imageElement) {
    return null;
  }

  return {
    image: props.element._state.imageElement,
  };
});

const canvasElementsStore = useCanvasElementsStore();

const updateState = (partialState: Partial<CanvasElementStateAsset>) => {
  canvasElementsStore.updateElementState<CanvasElementStateAsset>(
    props.element.id,
    partialState,
  );
};

onMounted(async () => {
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
      error: true,
    });
  } finally {
    updateState({
      loading: false,
    });
  }
});

const circleConfig = ref({
  x: 100,
  y: 100,
  radius: 50,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 4,
});
</script>

<template>
  <v-group :config="element.container">
    <v-circle v-if="!imageConfig" :config="circleConfig" />
    <v-image v-else :config="imageConfig" />
  </v-group>
</template>

<style scoped lang="scss">

</style>
