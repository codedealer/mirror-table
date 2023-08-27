<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode } from '~/models/types';
import clickOrDoubleClick from '~/utils/clickOrDoubleClick';
import DriveDirectoryTreeFolderContextMenu from '~/components/DriveDirectoryTreeFolderContextMenu.vue';

interface DriveDirectoryTreeFolderEmits {
  (event: 'createChildFolder', node: DriveTreeNode): void
}

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: string[]
  tree: Tree
}>();

defineEmits<DriveDirectoryTreeFolderEmits>();

const toggleFold = async () => {
  if (props.node.loaded) {
    props.tree.toggleFold(props.node, props.path);
    return;
  }

  const driveTreeStore = useDriveTreeStore();
  const result = await driveTreeStore.loadChildren(props.node);

  result && props.tree.toggleFold(props.node, props.path);
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
  <va-button
    class="drive-node drive-node__folder"
    color="text-primary"
    hover-behavior="opacity"
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
        size="medium"
      />
    </div>
    <div
      class="drive-node__name"
      :class="node?.data?.trashed ? 'drive-node__name--trashed' : ''"
    >
      {{ node.label }}
    </div>
    <div class="drive-node__actions">
      <va-popover
        message="Undo"
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
        @create-child-folder="$emit('createChildFolder', node)"
      />
    </div>
  </va-button>
</template>

<style scoped lang="scss">

</style>
