import type { Stat } from '@he-tree/tree-utils';
import type { DriveTreeNode } from '~/models/types';
import type { DriveTreeDragOpenProgress } from '~/utils/heTree';
import { dragContext } from '@he-tree/vue';
import { TREE_MAX_DEPTH } from '~/models/types';

const DRAG_OPEN_DELAY = 1200;

export const useDriveTreeController = () => {
  const driveTreeStore = useDriveTreeStore();

  const isDragging = ref(false);
  const hoveredFolderTarget = ref<Stat<DriveTreeNode> | null>(null);
  const pendingFolderDropTarget = ref<Stat<DriveTreeNode> | null>(null);
  const dragOpenProgress = ref<DriveTreeDragOpenProgress | null>(null);
  let dragOpenTimer: ReturnType<typeof setTimeout> | null = null;

  const clearHoverTimer = () => {
    if (dragOpenTimer) {
      clearTimeout(dragOpenTimer);
      dragOpenTimer = null;
    }
  };

  onBeforeUnmount(() => {
    clearHoverTimer();
  });

  const clearHoveredFolderTarget = (folderId?: string) => {
    if (folderId && hoveredFolderTarget.value?.data.id !== folderId) {
      return;
    }

    clearHoverTimer();
    hoveredFolderTarget.value = null;
    dragOpenProgress.value = null;
  };

  const clearDragState = () => {
    clearHoverTimer();
    isDragging.value = false;
    hoveredFolderTarget.value = null;
    pendingFolderDropTarget.value = null;
    dragOpenProgress.value = null;
  };

  const setHoveredFolderTarget = (stat: Stat<DriveTreeNode>) => {
    if (!isDragging.value || hoveredFolderTarget.value === stat) {
      return;
    }

    clearHoverTimer();
    hoveredFolderTarget.value = stat;
    dragOpenProgress.value = null;

    if (stat.open || stat.level >= TREE_MAX_DEPTH) {
      return;
    }

    dragOpenProgress.value = {
      folderId: stat.data.id,
      startedAt: Date.now(),
      duration: DRAG_OPEN_DELAY,
    };

    dragOpenTimer = setTimeout(async () => {
      if (hoveredFolderTarget.value !== stat) {
        return;
      }

      if (!stat.data.loaded) {
        await driveTreeStore.loadChildren(stat.data);
      }

      if (hoveredFolderTarget.value === stat) {
        stat.open = true;
        driveTreeStore.setFolderOpen(stat.data.id, true);
        dragOpenProgress.value = null;
      }
    }, DRAG_OPEN_DELAY);
  };

  const setPendingFolderDropTarget = (stat: Stat<DriveTreeNode>) => {
    pendingFolderDropTarget.value = stat;
    hoveredFolderTarget.value = stat;
    clearHoverTimer();
    dragOpenProgress.value = null;
  };

  const eachDraggable = (stat: Stat<DriveTreeNode>) => {
    const node = stat.data;
    return !node.loading && !node.disabled;
  };

  const eachDroppable = (stat: Stat<DriveTreeNode>) => {
    return stat.data.isFolder && !stat.data.disabled;
  };

  const rootDroppable = () => {
    return true;
  };

  const restoreOriginalPosition = (draggedStat: Stat<DriveTreeNode>) => {
    const startInfo = dragContext.startInfo;
    if (!startInfo) {
      return;
    }

    const startParentStat = startInfo.parent as Stat<DriveTreeNode> | null;
    startInfo.tree.batchUpdate(() => {
      startInfo.tree.move(draggedStat, startParentStat, startInfo.indexBeforeDrop);
    });
  };

  const handleBeforeDragStart = () => {
    clearDragState();
    isDragging.value = true;
  };

  const handleAfterDrop = async () => {
    const ctx = dragContext;
    if (!ctx?.startInfo) {
      clearDragState();
      return;
    }

    const startInfo = ctx.startInfo;
    const targetInfo = ctx.targetInfo;
    const draggedStat = startInfo.dragNode as Stat<DriveTreeNode>;
    const draggedNode = draggedStat.data;
    const oldParentStat = startInfo.parent as Stat<DriveTreeNode> | null;
    const oldParentId = oldParentStat?.data.id ?? driveTreeStore.visibleRootNode.id;
    const oldParentNode: DriveTreeNode = oldParentStat
      ? oldParentStat.data
      : driveTreeStore.visibleRootNode;

    const resolvedTargetStat = pendingFolderDropTarget.value
      ?? (targetInfo?.parent as Stat<DriveTreeNode> | null)
      ?? (draggedStat.parent as Stat<DriveTreeNode> | null);
    const newParentId = resolvedTargetStat?.data.id ?? driveTreeStore.visibleRootNode.id;
    const droppedInSameParent = newParentId === oldParentId;

    clearDragState();

    if (droppedInSameParent) {
      restoreOriginalPosition(draggedStat);
      return;
    }

    const newParentNode: DriveTreeNode = resolvedTargetStat
      ? resolvedTargetStat.data
      : driveTreeStore.visibleRootNode;

    await driveTreeStore.moveNode(draggedNode, oldParentNode, newParentNode);

    if (resolvedTargetStat && resolvedTargetStat.level >= TREE_MAX_DEPTH) {
      await driveTreeStore.setVisibleRootFolder(newParentNode);
      return;
    }

    if (resolvedTargetStat?.open) {
      driveTreeStore.setFolderOpen(newParentNode.id, true);
    }
  };

  return {
    isDragging,
    hoveredFolderTarget,
    dragOpenProgress,
    clearDragState,
    clearHoveredFolderTarget,
    setHoveredFolderTarget,
    setPendingFolderDropTarget,
    eachDraggable,
    eachDroppable,
    rootDroppable,
    handleBeforeDragStart,
    handleAfterDrop,
  };
};
