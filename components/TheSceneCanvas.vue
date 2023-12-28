<script setup lang="ts">
import { onKeyDown, onKeyUp, useEventListener, useResizeObserver } from '@vueuse/core';
import TheSceneCanvasStage from '~/components/TheSceneCanvasStage.vue';
import { isEditableElement } from '~/utils';

const canvasContainer = ref<HTMLDivElement | null>(null);
const canvasField = ref<HTMLDivElement | null>(null);

const canvasStageStore = useCanvasStageStore();
const canvasToolStore = useCanvasToolStore();

const selectTool = useSelectTool();

canvasToolStore.setActiveTool(selectTool);

const fieldDimensions = computed(() => {
  if (!canvasField.value) {
    return { width: 0, height: 0 };
  }

  return {
    width: `${canvasStageStore.fieldWidth}px`,
    height: `${canvasStageStore.fieldHeight}px`,
  };
});

useResizeObserver(canvasContainer, (entries) => {
  const entry = entries[0];

  canvasStageStore.applyConfig({
    width: entry.contentRect.width + canvasStageStore.fieldPadding * 2,
    height: entry.contentRect.height + canvasStageStore.fieldPadding * 2,
  });
});

const repositionStage = () => {
  if (!canvasStageStore.stage || !canvasContainer.value) {
    return;
  }

  const dx = canvasContainer.value.scrollLeft - canvasStageStore.fieldPadding;
  const dy = canvasContainer.value.scrollTop - canvasStageStore.fieldPadding;

  canvasStageStore.stage.container().style.transform = `translate(${dx}px, ${dy}px)`;

  canvasStageStore._scroll = {
    x: dx,
    y: dy,
  };
};

onMounted(() => {
  repositionStage();
});

useEventListener(
  canvasContainer,
  'scroll',
  repositionStage,
  { passive: true },
);

onKeyDown(' ', (e) => {
  if (e.target && isEditableElement(e.target)) {
    return;
  }

  e.preventDefault();
  if (!canvasStageStore.stage || canvasStageStore._stage.draggable) {
    return;
  }

  canvasStageStore.applyConfig({ draggable: true });
}, {
  dedupe: false,
});

onKeyUp(' ', (e) => {
  if (e.target && isEditableElement(e.target)) {
    return;
  }

  e.preventDefault();
  canvasStageStore.applyConfig({ draggable: false });
});
</script>

<template>
  <div ref="canvasContainer" class="canvas-container scroll-enabled">
    <component
      :is="canvasToolStore.activeTool.component"
      v-if="canvasToolStore.activeTool"
      v-once
    />

    <div
      ref="canvasField"
      :style="fieldDimensions"
      class="canvas-container__field scroll-enabled"
    >
      <TheSceneCanvasStage />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
