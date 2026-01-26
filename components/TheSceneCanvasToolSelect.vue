<script setup lang="ts">
import { watchArray } from '@vueuse/core';
import { isContainerNode, isSceneElementCanvasObjectAsset } from '~/models/types';
import { getNodeById } from '~/utils/canvasOps';

const canvasStageStore = useCanvasStageStore();
const canvasElementsStore = useCanvasElementsStore();

const { selectedElements } = storeToRefs(canvasElementsStore);

watchArray(selectedElements, (elements) => {
  if (!canvasStageStore.stage || !canvasStageStore.imageTransformer) {
    return;
  }

  canvasStageStore.imageTransformer.nodes(
    elements
      .map(element => getNodeById(canvasStageStore.stage!, element.id))
      .filter(isContainerNode),
  );

  // Set keepRatio based on selected element types:
  // - If any asset (image) is selected, keep ratio to prevent distortion
  // - If only text elements are selected, allow free resize
  const hasAssetElement = elements.some(isSceneElementCanvasObjectAsset);
  canvasStageStore.imageTransformer.keepRatio(hasAssetElement);
}, { immediate: true });

onBeforeMount(() => {
  canvasStageStore.imageTransformer && canvasStageStore.imageTransformer.nodes([]);
});
</script>

<template>
  <div class="canvas-tool-bar" />
</template>

<style scoped lang="scss">

</style>
