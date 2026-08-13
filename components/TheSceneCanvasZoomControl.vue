<script setup lang="ts">
import {
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
  CANVAS_ZOOM_STEP,
  useCanvasStageStore,
} from '~/stores/canvas-stage-store';
import { isCanvasZoomControlVisible } from '~/utils/canvasZoom';

const emit = defineEmits<{ zoom: [value: number] }>();
const canvasStageStore = useCanvasStageStore();
const tableStore = useTableStore();
const isVisible = computed(() => {
  if (tableStore.mode === undefined) {
    return false;
  }

  return isCanvasZoomControlVisible(tableStore.mode, tableStore.permissions);
});
const zoomPercent = computed(() => Math.round(canvasStageStore.zoom * 100));
const isMinZoom = computed(() => canvasStageStore.zoom <= CANVAS_ZOOM_MIN);
const isMaxZoom = computed(() => canvasStageStore.zoom >= CANVAS_ZOOM_MAX);

const onZoom = (value: number) => emit('zoom', value);
</script>

<template>
  <div
    v-if="isVisible"
    class="canvas-zoom-control"
    role="group"
    aria-label="Canvas zoom"
    @click.stop
    @pointerdown.stop
    @wheel.stop
  >
    <va-button
      preset="plain"
      icon="remove"
      :disabled="isMinZoom"
      aria-label="Zoom out"
      title="Zoom out"
      @click="onZoom(canvasStageStore.zoom - CANVAS_ZOOM_STEP)"
    />
    <va-button
      preset="plain"
      class="canvas-zoom-control__value"
      aria-label="Reset canvas zoom"
      title="Reset canvas zoom"
      @click="onZoom(1)"
    >
      {{ zoomPercent }}%
    </va-button>
    <va-button
      preset="plain"
      icon="add"
      :disabled="isMaxZoom"
      aria-label="Zoom in"
      title="Zoom in"
      @click="onZoom(canvasStageStore.zoom + CANVAS_ZOOM_STEP)"
    />
  </div>
</template>
