<script setup lang="ts">
import type { Stat } from '@he-tree/tree-utils';
import type { DriveTreeNode } from '~/models/types';
import type { HeTreePublicInstance } from '~/utils/heTree';
import { DriveDirectoryTreeFile, DriveDirectoryTreeFolder } from '#components';
import { Draggable } from '@he-tree/vue';
import {
  driveTreeClearHoveredFolderTargetKey,
  driveTreeDragOpenProgressKey,
  driveTreeHoveredFolderTargetKey,
  driveTreeIsDraggingKey,
  driveTreeRefKey,
  driveTreeSetHoveredFolderTargetKey,
  driveTreeSetPendingFolderDropTargetKey,
} from '~/utils/heTree';
import '@he-tree/vue/style/default.css';

const driveTreeStore = useDriveTreeStore();

const { nodes } = storeToRefs(driveTreeStore);

const treeRef = ref<InstanceType<typeof Draggable> | null>(null);
provide(driveTreeRefKey, treeRef as Ref<HeTreePublicInstance<DriveTreeNode> | null>);

const {
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
} = useDriveTreeController();

provide(driveTreeIsDraggingKey, isDragging);
provide(driveTreeHoveredFolderTargetKey, hoveredFolderTarget);
provide(driveTreeDragOpenProgressKey, dragOpenProgress);
provide(driveTreeSetHoveredFolderTargetKey, setHoveredFolderTarget);
provide(driveTreeClearHoveredFolderTargetKey, clearHoveredFolderTarget);
provide(driveTreeSetPendingFolderDropTargetKey, setPendingFolderDropTarget);
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
