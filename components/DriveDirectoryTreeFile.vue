<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode, ModalWindowContentMarkdown } from '~/models/types';
import { WindowFactory } from '~/models/Window';

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: string[]
  tree: Tree
}>();

const { file, label } = useDriveFile(toRef(() => props.node.id));

const nodeLabel = computed(() => {
  return label.value ?? props.node.label;
});

const toggleFile = async () => {
  if (!file.value || file.value?.trashed) {
    return;
  }
  const windowStore = useWindowStore();
  // check if file is already open
  const window = windowStore.windows.find(window => window.id === props.node.id);

  if (window) {
    windowStore.toggle(window);
    return;
  }

  // open file
  try {
    const driveFileStore = useDriveFileStore();
    const blob = await driveFileStore.downloadMedia(props.node.id);

    // assuming the file is a markdown file for now
    // create a new window
    const windowContent: ModalWindowContentMarkdown = {
      type: 'markdown',
      editing: false,
      data: blob,
    };

    const window = WindowFactory(
      props.node.id,
      nodeLabel.value,
      windowContent,
    );

    windowStore.add(window);
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  }
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
      <div class="drive-node__icon">
        <va-icon
          name="article"
          size="large"
          color="primary"
        />
      </div>
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

      <DriveDirectoryTreeFileContextMenu
        v-show="file && !file.trashed"
        :node="node"
        :path="path"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
