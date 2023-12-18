<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import TheSceneCanvasStage from '~/components/TheSceneCanvasStage.vue';

const canvasContainer = ref<HTMLDivElement | null>(null);

const canvasStageStore = useCanvasStageStore();

useResizeObserver(canvasContainer, (entries) => {
  const entry = entries[0];

  canvasStageStore.applyConfig({
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  });
});
</script>

<template>
  <div ref="canvasContainer" class="canvas-container">
    <div class="canvas-toolbar" />

    <TheSceneCanvasStage />
  </div>
</template>

<style scoped lang="scss">

</style>
