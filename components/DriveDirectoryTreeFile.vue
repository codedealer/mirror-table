<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode, ModalWindowContentMarkdown } from '~/models/types';
import { downloadFile } from '~/utils/driveOps';

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: string[]
  tree: Tree
}>();

const toggleFile = async () => {
  if (!props.node.data || props.node.data.trashed) {
    return;
  }
  const windowStore = useWindowStore();
  // check if file is already open
  const window = windowStore.windows.find(window => window.id === props.node.data!.id);

  if (window) {
    windowStore.toggle(window);
    return;
  }

  // open file
  const driveTreeStore = useDriveTreeStore();
  try {
    driveTreeStore.setNodeLoading(props.node, true);

    const file = await downloadFile(props.node.data.id);

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

    windowStore.add(
      props.node.data.id,
      props.node.data.name,
      windowContent,
      props.node,
    );
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  } finally {
    driveTreeStore.setNodeLoading(props.node, false);
  }
};
</script>

<template>
  <div class="drive-node drive-node__file">
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :loading="node.loading"
      :disabled="node.disabled"
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
        :class="node?.data?.trashed ? 'drive-node__name--trashed' : ''"
      >
        {{ node.label }}
      </div>
    </va-button>

    <div class="drive-node__actions" />
  </div>
</template>

<style scoped lang="scss">

</style>
