<script setup lang="ts">
import type { Stat } from '@he-tree/tree-utils';
import type { Draggable } from '@he-tree/vue';
import type { DriveTreeNode } from '~/models/types';
import { useDriveFolderContextActions } from '~/composables/useDriveFolderContextActions';
import { TREE_MAX_DEPTH } from '~/models/types';
import clickOrDoubleClick from '~/utils/clickOrDoubleClick';

const props = defineProps<{
  node: DriveTreeNode;
  stat: Stat<DriveTreeNode>;
}>();

const { file, label } = useDriveFile(toRef(() => props.node.id));

const treeRef = inject<Ref<InstanceType<typeof Draggable> | null>>('treeRef');
const isDragging = inject<Ref<boolean>>('isDragging', ref(false));
const hoveredFolderTarget = inject<Ref<Stat<DriveTreeNode> | null>>('hoveredFolderTarget', ref(null));
const dragOpenProgress = inject<Ref<{ folderId: string; startedAt: number; duration: number } | null>>('dragOpenProgress', ref(null));
const setHoveredFolderTarget = inject<((stat: Stat<DriveTreeNode>) => void) | undefined>('setHoveredFolderTarget');
const clearHoveredFolderTarget = inject<((folderId?: string) => void) | undefined>('clearHoveredFolderTarget');
const setPendingFolderDropTarget = inject<((stat: Stat<DriveTreeNode>) => void) | undefined>('setPendingFolderDropTarget');

// ── Sync tree processor when children change (lazy load / reload) ───────────
watch(() => props.node.children, (newChildren) => {
  if (!newChildren)
    return;
  const proc = (treeRef?.value as any)?.processor;
  if (!proc)
    return;

  const newIds = new Set(newChildren.map(c => c.id));
  // Remove stale stats still parented to this stat
  for (const oldStat of [...props.stat.children]) {
    if (
      oldStat.parent === props.stat
      && (!newIds.has(oldStat.data.id) || !newChildren.includes(oldStat.data))
    ) {
      proc.remove(oldStat);
    }
  }
  // Add stats for children not yet in the processor
  for (let i = 0; i < newChildren.length; i++) {
    if (!proc.has(newChildren[i])) {
      proc.add(newChildren[i], props.stat, i);
      continue;
    }

    const existingStat = proc.getStat(newChildren[i]);
    if (existingStat.parent !== props.stat) {
      proc.move(existingStat, props.stat, i);
    }
  }
}, { flush: 'sync' });

// ── Fold toggle ─────────────────────────────────────────────────────────────
const toggleFold = async () => {
  if (props.stat.open) {
    // eslint-disable-next-line vue/no-mutating-props -- @he-tree/vue stat is designed to be mutated
    props.stat.open = false;
    return;
  }
  if (props.stat.level >= TREE_MAX_DEPTH)
    return; // use double-click to change root instead
  const driveTreeStore = useDriveTreeStore();
  if (!props.node.loaded) {
    await driveTreeStore.loadChildren(props.node);
  }
  // eslint-disable-next-line vue/no-mutating-props -- @he-tree/vue stat is designed to be mutated
  props.stat.open = true;
};

const setRootFolder = () => {
  const driveTreeStore = useDriveTreeStore();
  driveTreeStore.setRootFolder(props.node);
};

const onClickOrDoubleClick = clickOrDoubleClick(toggleFold, setRootFolder);

const { actions } = useDriveFolderContextActions(
  file,
  toRef(() => props.node),
  toRef(() => props.stat),
);

const undoTrashFolder = () => {
  const driveTreeStore = useDriveTreeStore();
  driveTreeStore.removeFile(props.node, true);
};

const isDropTarget = computed(() => {
  return isDragging.value && hoveredFolderTarget.value?.data.id === props.node.id;
});

const isDragOpenTarget = computed(() => {
  return dragOpenProgress.value?.folderId === props.node.id;
});

const onDragEnter = (e: DragEvent) => {
  e.preventDefault();
  setHoveredFolderTarget?.(props.stat);
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  setHoveredFolderTarget?.(props.stat);
};

const onDragLeave = (e: DragEvent) => {
  const container = e.currentTarget as HTMLElement;
  const nextTarget = document.elementFromPoint(e.clientX, e.clientY);
  if (nextTarget && container.contains(nextTarget)) {
    return;
  }

  clearHoveredFolderTarget?.(props.node.id);
};

const onDropTarget = () => {
  setPendingFolderDropTarget?.(props.stat);
};

watch([() => isDragging.value, () => props.stat.open], () => {
  if (!isDragging.value || props.stat.open) {
    clearHoveredFolderTarget?.(props.node.id);
  }
});
</script>

<template>
  <div
    class="drive-node drive-node__folder"
    :class="{
      'drive-node__folder--drop-target': isDropTarget,
      'drive-node__drag-open-target': isDragOpenTarget,
      'drive-node__folder--open': stat.open && node.loaded,
    }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDropTarget"
  >
    <div
      v-if="isDragOpenTarget"
      class="drive-node__drag-progress"
    />

    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :loading="node.loading || file?.loading"
      :disabled="node.disabled || !file"
      preset="plain"
      @click="onClickOrDoubleClick"
    >
      <div class="drive-node__icon">
        <va-icon
          :name="stat.open ? 'folder_open' : 'folder'"
          :class="node.loaded ? '' : 'drive-node__icon--undetermined'"
          color="primary"
          size="large"
        />
      </div>
      <div
        class="drive-node__name"
        :class="file?.trashed ? 'drive-node__name--trashed' : ''"
      >
        {{ label }}
      </div>
    </va-button>

    <div class="drive-node__actions">
      <va-popover
        message="Undo"
        stick-to-edges
      >
        <va-button
          v-show="file?.trashed"
          preset="plain"
          color="primary-dark"
          size="medium"
          icon="replay"
          @click.stop="undoTrashFolder"
        />
      </va-popover>

      <ContextPanel
        v-show="file && !file.trashed"
        :actions="actions"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
