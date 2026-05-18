<script setup lang="ts">
import { useDebounceFn, useEventListener, useResizeObserver } from '@vueuse/core';
import TheSceneCanvasStage from '~/components/TheSceneCanvasStage.vue';

const canvasContainer = ref<HTMLDivElement | null>(null);
const canvasField = ref<HTMLDivElement | null>(null);

const canvasStageStore = useCanvasStageStore();
const canvasToolStore = useCanvasToolStore();
const sessionStore = useSessionStore();
const hotkeyStore = useHotkeyStore();
const tableStore = useTableStore();
const sceneStore = useSceneStore();
const driveFileStore = useDriveFileStore();
const notificationStore = useNotificationStore();
const driveTreeStore = useDriveTreeStore();

const { draggedFileDragPayload } = storeToRefs(driveTreeStore);
const isCanvasDragHovering = ref(false);

const clearDraggedPayload = () => {
  driveTreeStore.draggedFileDragPayload = null;
};

const selectTool = useSelectTool();
hotkeyStore.registerHotkey({
  id: 'select-tool',
  key: 'click',
  description: 'Move all private session screens to the designated position',
  namespace: 'Canvas',
  modifiers: { shift: true },
});
useTextTool();

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

const dbUpdateScreenFrame = useDebounceFn(sessionStore.updateScreenFrame, 1000);

const dbResizeHandler = useDebounceFn((entries) => {
  const entry = entries[0];

  canvasStageStore.applyConfig({
    width: entry.contentRect.width + canvasStageStore.fieldPadding * 2,
    height: entry.contentRect.height + canvasStageStore.fieldPadding * 2,
  });

  dbUpdateScreenFrame({
    x: (canvasContainer.value?.scrollLeft ?? 0),
    y: (canvasContainer.value?.scrollTop ?? 0),
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  });
}, 50);

useResizeObserver(canvasContainer, dbResizeHandler);

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

  dbUpdateScreenFrame({
    x: canvasContainer.value.scrollLeft,
    y: canvasContainer.value.scrollTop,
    width: canvasContainer.value.clientWidth,
    height: canvasContainer.value.clientHeight,
  });
};

/**
 * Handle dragenter event on canvas
 */
const onCanvasDragEnter = (e: DragEvent) => {
  if (tableStore.mode !== TableModes.OWN || !draggedFileDragPayload.value) {
    return;
  }

  // Allow hover affordance while eligibility is resolving. Drop still enforces final eligibility.
  if (draggedFileDragPayload.value.eligibility === 'ineligible') {
    return;
  }

  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  isCanvasDragHovering.value = true;
};

/**
 * Handle dragover event on canvas (required to allow drop)
 */
const onCanvasDragOver = (e: DragEvent) => {
  if (tableStore.mode !== TableModes.OWN || !draggedFileDragPayload.value) {
    return;
  }

  if (draggedFileDragPayload.value.eligibility === 'ineligible') {
    isCanvasDragHovering.value = false;
    return;
  }

  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  isCanvasDragHovering.value = true;
};

/**
 * Handle dragleave event on canvas
 */
const onCanvasDragLeave = (e: DragEvent) => {
  // Only clear hover if leaving the canvas field entirely
  if (e.target === canvasField.value) {
    isCanvasDragHovering.value = false;
  }
};

/**
 * Handle drop event on canvas
 */
const onCanvasDrop = async (e: DragEvent) => {
  e.preventDefault();
  isCanvasDragHovering.value = false;

  try {
    // Validate preconditions
    if (!canvasStageStore.stage || tableStore.mode !== TableModes.OWN || !draggedFileDragPayload.value || !sceneStore.scene) {
      return;
    }

    const fileId = draggedFileDragPayload.value.nodeId;

    // Fetch file lazily only on real canvas drop.
    const { file: driveAsset } = await driveFileStore.getFile(fileId);
    if (
      !driveAsset
      || !isDriveAsset(driveAsset)
      || driveAsset.appProperties.kind === AssetPropertiesKinds.TEXT
      || !driveAsset.appProperties.preview
      || !driveAsset.capabilities?.canDownload
    ) {
      return; // Silent no-op for non-assets
    }

    // Get drop position from event
    if (e.clientX == null || e.clientY == null) {
      return;
    }

    // Use the coordinate converter from canvas stage store
    const stageCoords = canvasStageStore.browserCoordsToStageCoords(
      e.clientX,
      e.clientY,
      driveAsset.appProperties.preview?.nativeWidth ?? 200,
      driveAsset.appProperties.preview?.nativeHeight ?? 200,
      driveAsset.appProperties.preview?.scaleX ?? 1,
      driveAsset.appProperties.preview?.scaleY ?? 1,
    );

    if (!stageCoords) {
      return; // No-op if coordinate conversion fails
    }

    // Insert asset at drop position
    await sceneStore.addAsset(driveAsset, stageCoords, { enabled: false });
  } catch (error) {
    notificationStore.error('Failed to add asset to canvas.');
    console.error(error);
  } finally {
    clearDraggedPayload();
  }
};

onMounted(() => {
  repositionStage();

  const { activeSession } = storeToRefs(sessionStore);
  watch(activeSession, (session) => {
    if (tableStore.mode !== TableModes.PRESENTATION) {
      return;
    }
    if (session?.screen) {
      canvasContainer.value?.scrollTo({
        left: session.screen.x,
        top: session.screen.y,
        behavior: 'smooth',
      });
    }
  }, { deep: true });
  // Attach drop event listeners to canvasField
  if (canvasField.value) {
    useEventListener(canvasField, 'dragenter', onCanvasDragEnter);
    useEventListener(canvasField, 'dragover', onCanvasDragOver);
    useEventListener(canvasField, 'dragleave', onCanvasDragLeave);
    useEventListener(canvasField, 'drop', onCanvasDrop);
  }
});

useEventListener(
  canvasContainer,
  'scroll',
  repositionStage,
  { passive: true },
);
</script>

<template>
  <div ref="canvasContainer" class="canvas-container scroll-enabled">
    <component
      :is="canvasToolStore.activeTool.component"
      v-if="canvasToolStore.activeTool"
    />

    <div
      ref="canvasField"
      :style="fieldDimensions"
      class="canvas-container__field scroll-enabled" :class="[
        { 'canvas-container__field--drop-active': isCanvasDragHovering },
      ]"
    >
      <TheSceneCanvasStage />
    </div>
  </div>
</template>

<style scoped lang="scss">
.canvas-container__field--drop-active {
  background: linear-gradient(135deg, rgba(250, 69, 171, 0.08) 0%, rgba(250, 69, 171, 0.04) 100%);
  border: 2px dashed rgba(250, 69, 171, 0.3);
  border-radius: 4px;
}
</style>
