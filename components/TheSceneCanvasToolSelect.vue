<script setup lang="ts">
import { watchArray } from '@vueuse/core';
import { getNodeById } from '~/utils/canvasOps';
import { isContainerNode } from '~/models/types';

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
