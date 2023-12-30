<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode, ModalWindowContentMarkdown } from '~/models/types';
import { WindowFactory } from '~/models/Window';
import { useDriveFileContextActions } from '~/composables/useDriveFileContextActions';

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: number[]
  tree: Tree
}>();

const { file, label } = useDriveFile(toRef(() => props.node.id));

const nodeLabel = computed(() => {
  return label.value ?? props.node.label;
});

const { actions } = useDriveFileContextActions(file, toRef(() => props.node));

const toggleFile = () => {
  if (!file.value || file.value?.trashed) {
    return;
  }
  const windowStore = useWindowStore();
  // check if file is already open
  const existingWindow = windowStore.windows.find(window => window.id === props.node.id);

  if (existingWindow) {
    windowStore.toggle(existingWindow);
    return;
  }

  // open file
  // assuming the file is a markdown file for now
  // create a new window
  const windowContent: ModalWindowContentMarkdown = {
    type: 'markdown',
    editing: false,
    data: undefined,
  };

  const window = WindowFactory(
    props.node.id,
    nodeLabel.value,
    windowContent,
  );

  windowStore.add(window);
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
      @click="toggleFile"
    >
      <DriveDirectoryTreeFileIcon
        :node="node"
        :file="file"
      />
      <div
        class="drive-node__name"
        :class="file?.trashed ? 'drive-node__name--trashed' : ''"
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
