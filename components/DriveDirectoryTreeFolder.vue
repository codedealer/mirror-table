<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode } from '~/models/types';
import clickOrDoubleClick from '~/utils/clickOrDoubleClick';

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
    <div class="drive-node__name">
      {{ node.label }}
    </div>
    <div class="drive-node__actions">
      <va-button-dropdown
        icon="more_vert"
        opened-icon="more_vert"
        preset="plain"
        color="primary-dark"
        size="medium"
        stick-to-edges
        @click.stop
      >
        <va-list class="drive-node__context-menu">
          <va-list-item
            href="#"
            @click="$emit('createChildFolder', node)"
          >
            <va-list-item-section icon>
              <va-icon
                name="folder"
                color="primary"
                size="small"
              />
            </va-list-item-section>
            <va-list-item-section>
              <va-list-item-label caption>
                Create new folder
              </va-list-item-label>
            </va-list-item-section>
          </va-list-item>
        </va-list>
      </va-button-dropdown>
    </div>
  </va-button>
</template>

<style scoped lang="scss">

</style>
