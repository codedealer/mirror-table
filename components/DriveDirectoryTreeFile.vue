<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode } from '~/models/types';
import { useDriveFileContextActions } from '~/composables/useDriveFileContextActions';
import toggleFile from '~/utils/toggleFile';

const props = defineProps<{
  node: DriveTreeNode;
  index: number;
  path: number[];
  tree: Tree;
}>();

const { file, label, error } = useDriveFile(toRef(() => props.node.id));

const nodeLabel = computed(() => {
  return label.value ?? props.node.label;
});

const { actions } = useDriveFileContextActions(file, toRef(() => props.node));

const onToggleFile = () => {
  toggleFile(file.value, label.value);
};

const undoTrashFolder = () => {
  const driveTreeStore = useDriveTreeStore();
  driveTreeStore.removeFile(props.node, true);
};
</script>

<template>
  <div class="drive-node drive-node__file">
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :loading="node.loading || file?.loading"
      :disabled="node.disabled || !file"
      preset="plain"
      @click="onToggleFile"
    >
      <DriveDirectoryTreeFileIcon
        :file="file"
        :error="error"
      />
      <div
        class="drive-node__name"
        :class="file?.trashed ? 'drive-node__name--trashed' : ''"
        :title="nodeLabel"
      >
        {{ nodeLabel }}
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
