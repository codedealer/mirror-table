<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode, ModalWindowContentMarkdown } from '~/models/types';
import { downloadMedia } from '~/utils/driveOps';
import { WindowFactory } from '~/models/Window';

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: string[]
  tree: Tree
}>();

const { file, label } = useDriveFileHelper(ref(props.node.id));

const nodeLabel = computed(() => {
  return label.value ?? props.node.label;
});

const toggleFile = async () => {
  if (!file.value || file.value.trashed) {
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
  // TODO: move it out
  const driveTreeStore = useDriveTreeStore();
  try {
    driveTreeStore.setNodeLoading(props.node, true);

    const file = await downloadMedia(props.node.data.id);

    // assuming the file is a markdown file for now
    // create a new window
    const windowContent: ModalWindowContentMarkdown = {
      type: 'markdown',
      editing: false,
      data: {
        meta: props.node.data,
        body: file,
      },
    };

    const window = WindowFactory(
      props.node.data.id,
      stripFileExtension(props.node.data.name),
      windowContent,
    );

    window.node = props.node;

    windowStore.add(window);
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  } finally {
    driveTreeStore.setNodeLoading(props.node, false);
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
