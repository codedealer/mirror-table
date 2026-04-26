<script setup lang="ts">
import type { Stat } from '@he-tree/tree-utils';
import type { DriveTreeNode } from '~/models/types';
import { DriveDirectoryTreeFile, DriveDirectoryTreeFolder } from '#components';
import { dragContext, Draggable } from '@he-tree/vue';
import { TREE_MAX_DEPTH } from '~/models/types';
import '@he-tree/vue/style/default.css';

const DRAG_OPEN_DELAY = 1200;

const driveTreeStore = useDriveTreeStore();

const { nodes } = storeToRefs(driveTreeStore);

const treeRef = ref<InstanceType<typeof Draggable> | null>(null);
provide('treeRef', treeRef);

const isDragging = ref(false);
provide('isDragging', isDragging);

const hoveredFolderTarget = ref<Stat<DriveTreeNode> | null>(null);
const pendingFolderDropTarget = ref<Stat<DriveTreeNode> | null>(null);
const dragOpenProgress = ref<{ folderId: string; startedAt: number; duration: number } | null>(null);
let dragOpenTimer: ReturnType<typeof setTimeout> | null = null;

const clearHoverTimer = () => {
  if (dragOpenTimer) {
    clearTimeout(dragOpenTimer);
    dragOpenTimer = null;
  }
};

const clearDragState = () => {
  clearHoverTimer();
  isDragging.value = false;
  hoveredFolderTarget.value = null;
  pendingFolderDropTarget.value = null;
  dragOpenProgress.value = null;
};

const setHoveredFolderTarget = (stat: Stat<DriveTreeNode>) => {
  if (!isDragging.value) {
    return;
  }

  if (hoveredFolderTarget.value === stat) {
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

provide('hoveredFolderTarget', hoveredFolderTarget);
provide('dragOpenProgress', dragOpenProgress);
provide('setHoveredFolderTarget', setHoveredFolderTarget);
provide('clearHoveredFolderTarget', clearHoveredFolderTarget);
provide('setPendingFolderDropTarget', setPendingFolderDropTarget);

// ── Draggable / droppable rules ──────────────────────────────────────────────

const eachDraggable = (_stat: Stat<DriveTreeNode>) => {
  const node = _stat.data;
  return !node.loading && !node.disabled;
};

const eachDroppable = (stat: Stat<DriveTreeNode>) => {
  // Only folders are valid drop targets
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

// ── Drop handler ─────────────────────────────────────────────────────────────
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
    : driveTreeStore.rootNode;

  const explicitTarget = pendingFolderDropTarget.value ?? hoveredFolderTarget.value;
  const resolvedTargetStat = explicitTarget && !isInvalidFolderTarget(explicitTarget, draggedStat)
    ? explicitTarget
    : (draggedStat.parent as Stat<DriveTreeNode> | null);

  clearDragState();

  const newParentNode: DriveTreeNode = resolvedTargetStat
    ? resolvedTargetStat.data
    : driveTreeStore.rootNode;

  if (newParentNode.id === oldParentNode.id)
    return; // no actual move

  await driveTreeStore.moveNode(draggedNode, oldParentNode, newParentNode);

  if (resolvedTargetStat && resolvedTargetStat.level >= TREE_MAX_DEPTH) {
    await driveTreeStore.setRootFolder(newParentNode);
    return;
  }

  if (resolvedTargetStat && !resolvedTargetStat.open) {
    if (!newParentNode.loaded) {
      await driveTreeStore.loadChildren(newParentNode);
    }

    resolvedTargetStat.open = true;
  }
};
</script>

<template>
  <div class="ghost-container drive-tree-container">
    <DriveDirectoryTreeHeader />

    <va-scroll-container vertical>
      <Draggable
        ref="treeRef"
        v-model="nodes"
        :default-open="false"
        :indent="20"
        :each-draggable="eachDraggable"
        :each-droppable="eachDroppable"
        :drag-open="false"
        :watermark="false"
        update-behavior="disabled"
        children-key="children"
        :node-key="(stat: Stat<DriveTreeNode>) => stat.data.id"
        @before-drag-start="handleBeforeDragStart"
        @after-drop="handleAfterDrop"
        @leave="clearDragState"
      >
        <template #default="{ node, stat }: { node: DriveTreeNode, stat: Stat<DriveTreeNode> }">
          <component
            :is="node.isFolder ? DriveDirectoryTreeFolder : DriveDirectoryTreeFile"
            :node="node"
            :stat="stat"
          />
        </template>
      </Draggable>
    </va-scroll-container>

    <DriveDirectoryTreeModal />
  </div>
</template>

<style scoped lang="scss">

</style>
