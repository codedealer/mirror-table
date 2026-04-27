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
        dragOpenProgress.value = null;
      }
    }, DRAG_OPEN_DELAY);
  };

  const clearHoveredFolderTarget = (folderId?: string) => {
    if (folderId && hoveredFolderTarget.value?.data.id !== folderId) {
      return;
    }

    clearHoverTimer();
    hoveredFolderTarget.value = null;
    dragOpenProgress.value = null;
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

  const isInvalidFolderTarget = (
    targetStat: Stat<DriveTreeNode>,
    draggedStat: Stat<DriveTreeNode>,
  ) => {
    let current: Stat<DriveTreeNode> | null = targetStat;

    while (current) {
      if (current === draggedStat) {
        return true;
      }

      current = current.parent as Stat<DriveTreeNode> | null;
    }

    return false;
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

    const draggedStat = ctx.startInfo.dragNode as Stat<DriveTreeNode>;
    const draggedNode = draggedStat.data;
    const oldParentNode: DriveTreeNode = ctx.startInfo.parent
      ? (ctx.startInfo.parent as Stat<DriveTreeNode>).data
      : driveTreeStore.visibleRootNode;

    const explicitTarget = pendingFolderDropTarget.value ?? hoveredFolderTarget.value;
    const resolvedTargetStat = explicitTarget && !isInvalidFolderTarget(explicitTarget, draggedStat)
      ? explicitTarget
      : (draggedStat.parent as Stat<DriveTreeNode> | null);

    clearDragState();

    const newParentNode: DriveTreeNode = resolvedTargetStat
      ? resolvedTargetStat.data
      : driveTreeStore.visibleRootNode;

    if (newParentNode.id === oldParentNode.id) {
      return;
    }

    await driveTreeStore.moveNode(draggedNode, oldParentNode, newParentNode);

    if (resolvedTargetStat && resolvedTargetStat.level >= TREE_MAX_DEPTH) {
      await driveTreeStore.setVisibleRootFolder(newParentNode);
      return;
    }

    if (resolvedTargetStat && !resolvedTargetStat.open) {
      if (!newParentNode.loaded) {
        await driveTreeStore.loadChildren(newParentNode);
      }

      resolvedTargetStat.open = true;
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
    handleBeforeDragStart,
    handleAfterDrop,
  };
};
