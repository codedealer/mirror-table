<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import TheSceneCanvasStage from '~/components/TheSceneCanvasStage.vue';

const canvasContainer = ref<HTMLDivElement | null>(null);

const canvasStageStore = useCanvasStageStore();

useResizeObserver(canvasContainer, (entries) => {
  const entry = entries[0];

  canvasStageStore.applyConfig({
    width: entry.contentRect.width + 1000,
    height: entry.contentRect.height + 1000,
  });
});

const repositionStage = () => {
  if (!canvasStageStore.stage) return;

  const dx = (canvasContainer.value?.scrollLeft ?? 0) - 500;
  const dy = (canvasContainer.value?.scrollTop ?? 0) - 500;

  canvasStageStore.stage.container().style.transform = `translate(${dx}px, ${dy}px)`;

  canvasStageStore.applyConfig({
    x: -dx,
    y: -dy,
  });
}

repositionStage();

onMounted(() => {
  canvasContainer.value?.addEventListener('scroll', repositionStage);
});
</script>

<template>
  <div ref="canvasContainer" class="canvas-container scroll-enabled">
    <div class="canvas-toolbar" />

    <div class="canvas-container__field scroll-enabled">
      <TheSceneCanvasStage/>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
