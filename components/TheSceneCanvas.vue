<script setup lang="ts">
import { useDebounceFn, useEventListener, useResizeObserver } from '@vueuse/core';
import TheSceneCanvasStage from '~/components/TheSceneCanvasStage.vue';
import { importImageFilesAsAssets } from '~/composables/useTableImportImagesAsScenes';

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
const userStore = useUserStore();

const { draggedFileDragPayload } = storeToRefs(driveTreeStore);
const isCanvasDragHovering = ref(false);
const isExternalImageDragHovering = ref(false);
const isExternalImageImporting = ref(false);
const externalImageImportCompleted = ref(0);
const externalImageImportTotal = ref(0);
const dropUploadMode = ref<AssetPropertiesKind>(AssetPropertiesKinds.IMAGE);
const MAX_EXTERNAL_DROP_IMAGE_FILES = 20;

type CanvasDropSource = 'drive-tree' | 'external-images';
const canvasDropSource = ref<CanvasDropSource | null>(null);

const clearDraggedPayload = () => {
  driveTreeStore.draggedFileDragPayload = null;
};

const clearCanvasDragHover = () => {
  isCanvasDragHovering.value = false;
  isExternalImageDragHovering.value = false;
  canvasDropSource.value = null;
  dropUploadMode.value = AssetPropertiesKinds.IMAGE;
};

const hasDriveTreePayload = (payload: typeof draggedFileDragPayload.value) => {
  return !!payload && payload.eligibility !== 'ineligible';
};

const extractDroppedFiles = (dataTransfer: DataTransfer | null | undefined): File[] => {
  if (!dataTransfer) {
    return [];
  }

  const files = Array.from(dataTransfer.files ?? []);

  if (files.length) {
    return files;
  }

  const itemFiles = Array.from(dataTransfer.items ?? [])
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => !!file);

  return itemFiles;
};

const extractDroppedImageFiles = (dataTransfer: DataTransfer | null | undefined): File[] => {
  return extractDroppedFiles(dataTransfer)
    .filter(file => file.type.startsWith('image/'));
};

const isExternalImageDragEvent = (event: DragEvent) => {
  // During dragenter/dragover the browser hides file contents for security.
  // The only reliable signal is dataTransfer.types which includes 'Files' (capital F)
  // when the drag originates from the OS file system.
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
};

const updateDropUploadMode = (event: DragEvent) => {
  dropUploadMode.value = event.shiftKey
    ? AssetPropertiesKinds.COMPLEX
    : AssetPropertiesKinds.IMAGE;
};

const startExternalImageImportProgress = (total: number) => {
  isExternalImageImporting.value = true;
  externalImageImportCompleted.value = 0;
  externalImageImportTotal.value = total;
};

const clearExternalImageImportProgress = () => {
  isExternalImageImporting.value = false;
  externalImageImportCompleted.value = 0;
  externalImageImportTotal.value = 0;
};

const isDropOverlayVisible = computed(() => {
  return isCanvasDragHovering.value || isExternalImageImporting.value;
});

const dropOverlayTitle = computed(() => {
  if (isExternalImageImporting.value) {
    return 'Importing dropped images';
  }

  if (!isCanvasDragHovering.value) {
    return '';
  }

  if (canvasDropSource.value === 'drive-tree') {
    return 'Add to scene';
  }

  return dropUploadMode.value === AssetPropertiesKinds.COMPLEX
    ? 'Upload as asset'
    : 'Upload as image';
});

const dropOverlaySubtitle = computed(() => {
  if (isExternalImageImporting.value) {
    return `${externalImageImportCompleted.value}/${externalImageImportTotal.value} processed`;
  }

  if (!isCanvasDragHovering.value || !isExternalImageDragHovering.value) {
    return '';
  }

  return 'Hold shift to upload as asset';
});

const handleDriveTreeAssetDrop = async (event: DragEvent) => {
  if (!canvasStageStore.stage || !draggedFileDragPayload.value || !sceneStore.scene) {
    return;
  }

  const fileId = draggedFileDragPayload.value.nodeId;

  const { file: driveAsset } = await driveFileStore.getFile(fileId);
  if (
    !driveAsset
    || !isDriveAsset(driveAsset)
    || driveAsset.appProperties.kind === AssetPropertiesKinds.TEXT
    || !driveAsset.appProperties.preview
    || !driveAsset.capabilities?.canDownload
  ) {
    return;
  }

  if (event.clientX == null || event.clientY == null) {
    return;
  }

  const stageCoords = canvasStageStore.browserCoordsToStageCoords(
    event.clientX,
    event.clientY,
    driveAsset.appProperties.preview?.nativeWidth ?? 200,
    driveAsset.appProperties.preview?.nativeHeight ?? 200,
    driveAsset.appProperties.preview?.scaleX ?? 1,
    driveAsset.appProperties.preview?.scaleY ?? 1,
  );

  if (!stageCoords) {
    return;
  }

  await sceneStore.addAsset(driveAsset, stageCoords, { enabled: false });
};

const handleExternalImageDrop = async (event: DragEvent, imageFiles: File[]) => {
  if (!canvasStageStore.stage || !sceneStore.scene) {
    return;
  }

  if (event.clientX == null || event.clientY == null) {
    return;
  }

  const preferredParentId = driveTreeStore.visibleRootNode.id;
  const fallbackParentId = userStore.profile?.settings.driveFolderId;
  const parentFolderId = preferredParentId || fallbackParentId;

  if (!parentFolderId) {
    notificationStore.error('User workspace folder not configured');
    return;
  }

  const filesToProcess = imageFiles.slice(0, MAX_EXTERNAL_DROP_IMAGE_FILES);
  const skippedCount = Math.max(imageFiles.length - filesToProcess.length, 0);
  if (skippedCount > 0) {
    notificationStore.add({
      message: `Imported first ${MAX_EXTERNAL_DROP_IMAGE_FILES} image file(s). Skipped ${skippedCount}.`,
      icon: 'warning_amber',
      color: 'var(--va-warning)',
    });
  }

  const mode = event.shiftKey
    ? AssetPropertiesKinds.COMPLEX
    : AssetPropertiesKinds.IMAGE;

  const stageCoords = canvasStageStore.browserCoordsToStageCoords(
    event.clientX,
    event.clientY,
    1,
    1,
    1,
    1,
  );

  if (!stageCoords) {
    return;
  }

  startExternalImageImportProgress(filesToProcess.length);

  try {
    const { assets, successCount, failureCount } = await importImageFilesAsAssets(
      filesToProcess,
      mode,
      parentFolderId,
      {
        onFileDone: ({ completedCount, totalCount }) => {
          externalImageImportCompleted.value = completedCount;
          externalImageImportTotal.value = totalCount;
        },
      },
    );

    for (const asset of assets) {
      await sceneStore.addAsset(asset, stageCoords, { enabled: false });
    }

    if (successCount > 0) {
      await driveTreeStore.refreshVisibleRootFolder({ onlyIfFolderId: parentFolderId });

      notificationStore.success(
        failureCount > 0
          ? `Imported ${successCount} image asset(s), ${failureCount} failed`
          : `Successfully imported ${successCount} image asset(s)`,
      );
      return;
    }

    notificationStore.error('Failed to import dropped image files');
  } finally {
    clearExternalImageImportProgress();
  }
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
  if (tableStore.mode !== TableModes.OWN) {
    return;
  }

  const hasDrivePayload = hasDriveTreePayload(draggedFileDragPayload.value);
  const hasExternalImages = isExternalImageDragEvent(e);

  if (!hasDrivePayload && !hasExternalImages) {
    return;
  }

  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  isCanvasDragHovering.value = true;

  if (hasExternalImages) {
    canvasDropSource.value = 'external-images';
    isExternalImageDragHovering.value = true;
    updateDropUploadMode(e);
    return;
  }

  canvasDropSource.value = 'drive-tree';
  isExternalImageDragHovering.value = false;
};

/**
 * Handle dragover event on canvas (required to allow drop)
 */
const onCanvasDragOver = (e: DragEvent) => {
  if (tableStore.mode !== TableModes.OWN) {
    return;
  }

  const hasDrivePayload = hasDriveTreePayload(draggedFileDragPayload.value);
  const hasExternalImages = isExternalImageDragEvent(e);

  if (!hasDrivePayload && !hasExternalImages) {
    isCanvasDragHovering.value = false;
    return;
  }

  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  isCanvasDragHovering.value = true;

  if (hasExternalImages) {
    canvasDropSource.value = 'external-images';
    isExternalImageDragHovering.value = true;
    updateDropUploadMode(e);
    return;
  }

  canvasDropSource.value = 'drive-tree';
  isExternalImageDragHovering.value = false;
};

/**
 * Handle dragleave event on canvas
 */
const onCanvasDragLeave = (e: DragEvent) => {
  const relatedTarget = e.relatedTarget as Node | null;
  if (canvasField.value && relatedTarget && canvasField.value.contains(relatedTarget)) {
    return;
  }

  clearCanvasDragHover();
};

/**
 * Handle drop event on canvas
 */
const onCanvasDrop = async (e: DragEvent) => {
  e.preventDefault();

  try {
    if (tableStore.mode !== TableModes.OWN || !sceneStore.scene) {
      return;
    }

    const hasDrivePayload = hasDriveTreePayload(draggedFileDragPayload.value);
    const droppedFiles = extractDroppedFiles(e.dataTransfer);
    const droppedImageFiles = extractDroppedImageFiles(e.dataTransfer);
    const hasExternalImages = droppedImageFiles.length > 0;

    if (hasDrivePayload && hasExternalImages) {
      notificationStore.add({
        message: 'Ambiguous drop source. Please drop either a Drive tree item or image files.',
        icon: 'warning_amber',
        color: 'var(--va-warning)',
      });
      return;
    }

    if (hasDrivePayload) {
      await handleDriveTreeAssetDrop(e);
      return;
    }

    if (hasExternalImages) {
      await handleExternalImageDrop(e, droppedImageFiles);
      return;
    }

    if (droppedFiles.length > 0) {
      notificationStore.error('Unsupported drop');
    }
  } catch (error) {
    notificationStore.error('Failed to add asset to canvas.');
    console.error(error);
  } finally {
    clearCanvasDragHover();
    clearDraggedPayload();
  }
};

onMounted(() => {
  repositionStage();

  watch(draggedFileDragPayload, (payload) => {
    if (!payload) {
      clearCanvasDragHover();
    }
  });

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
});

useEventListener(
  canvasContainer,
  'scroll',
  repositionStage,
  { passive: true },
);

// Attach drag/drop event listeners at setup level so VueUse's internal watch
// runs during the normal setup flush (not inside onMounted's post-flush cycle).
useEventListener(canvasField, 'dragenter', onCanvasDragEnter);
useEventListener(canvasField, 'dragover', onCanvasDragOver);
useEventListener(canvasField, 'dragleave', onCanvasDragLeave);
useEventListener(canvasField, 'drop', onCanvasDrop);

// Ensure canvas drag overlay is cleared when drag ends outside canvas handlers.
if (import.meta.client) {
  useEventListener(window, 'dragend', clearCanvasDragHover);
  useEventListener(window, 'drop', clearCanvasDragHover);
}
</script>

<template>
  <div ref="canvasContainer" class="canvas-container scroll-enabled">
    <component
      :is="canvasToolStore.activeTool.component"
      v-if="canvasToolStore.activeTool"
    />

    <div v-if="isDropOverlayVisible" class="canvas-container__drop-overlay">
      <div class="canvas-container__drop-title">
        {{ dropOverlayTitle }}
      </div>
      <div v-if="dropOverlaySubtitle" class="canvas-container__drop-subtitle">
        {{ dropOverlaySubtitle }}
      </div>
    </div>

    <div
      ref="canvasField"
      :style="fieldDimensions"
      class="canvas-container__field scroll-enabled" :class="[
        {
          'canvas-container__field--drop-active': isDropOverlayVisible,
          'canvas-container__field--uploading': isExternalImageImporting,
        },
      ]"
    >
      <TheSceneCanvasStage />
    </div>
  </div>
</template>

<style scoped lang="scss">
.canvas-container__drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
}

.canvas-container__drop-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: rgba(250, 69, 171, 0.95);
}

.canvas-container__drop-subtitle {
  font-size: 0.92rem;
  font-weight: 500;
  color: rgba(250, 69, 171, 0.72);
}

.canvas-container__field--drop-active {
  position: relative;
  background: linear-gradient(135deg, rgba(250, 69, 171, 0.08) 0%, rgba(250, 69, 171, 0.04) 100%);
  border-radius: 4px;
}

.canvas-container__field--uploading {
  background: linear-gradient(135deg, rgba(250, 69, 171, 0.13) 0%, rgba(250, 69, 171, 0.06) 100%);
}
</style>
