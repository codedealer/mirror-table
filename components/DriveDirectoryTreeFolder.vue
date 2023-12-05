<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode } from '~/models/types';
import clickOrDoubleClick from '~/utils/clickOrDoubleClick';
import DriveDirectoryTreeFolderContextMenu from '~/components/DriveDirectoryTreeFolderContextMenu.vue';

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: string[]
  tree: Tree
}>();

const toggleFold = () => {
  const driveTreeStore = useDriveTreeStore();
  driveTreeStore.toggleFold(props.node, props.path);
};

const setRootFolder = () => {
  const driveTreeStore = useDriveTreeStore();
  driveTreeStore.setRootFolder(props.node);
};

const onClickOrDoubleClick = clickOrDoubleClick(toggleFold, setRootFolder);

const undoTrashFolder = () => {
  const driveTreeStore = useDriveTreeStore();
  driveTreeStore.removeFile(props.node, true);
};
</script>

<template>
  <div
    class="drive-node drive-node__folder"
  >
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :loading="node.loading"
      :disabled="node.disabled"
      preset="plain"
      @click="onClickOrDoubleClick"
    >
      <div class="drive-node__icon">
        <va-icon
          :name="node.$folded ? 'folder' : 'folder_open'"
          :class="node.loaded ? '' : 'drive-node__icon--undetermined'"
          color="primary"
          size="large"
        />
      </div>
      <div
        class="drive-node__name"
        :class="node?.data?.trashed ? 'drive-node__name--trashed' : ''"
      >
        {{ node.label }}
      </div>
    </va-button>

    <div class="drive-node__actions">
      <va-popover
        message="Undo"
        stick-to-edges
      >
        <va-button
          v-show="node?.data?.trashed"
          preset="plain"
          color="primary-dark"
          size="medium"
          icon="replay"
          @click.stop="undoTrashFolder"
        />
      </va-popover>

      <DriveDirectoryTreeFolderContextMenu
        v-show="!node?.data?.trashed"
        :node="node"
        :path="path"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
