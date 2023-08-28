<script setup lang="ts">
import { Fold, Tree as NakedTree } from 'he-tree-vue';
import { DriveDirectoryTreeFile, DriveDirectoryTreeFolder } from '#components';
import type { DriveTreeNode } from '~/models/types';

const Tree = NakedTree.mixPlugins([
  Fold,
]);

const driveTreeStore = useDriveTreeStore();

const { nodes } = toRefs(driveTreeStore);

const showFolderModal = ref(false);
const newFolderName = ref('');
const newFolderParent = ref<DriveTreeNode | undefined>();

const cancel = () => {
  showFolderModal.value = false;
  newFolderName.value = '';
  newFolderParent.value = undefined;
};

const createChildFolder = async () => {
  if (!newFolderName.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error('Folder name cannot be empty');
    return;
  }

  showFolderModal.value = false;

  if (!newFolderParent.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error('Parent folder is not defined');
    return;
  }

  const result = await driveTreeStore.createChild(newFolderName.value, newFolderParent.value);

  if (!result) {
    showFolderModal.value = true;
    return;
  }

  cancel();
};

const promptFolderName = (parent: DriveTreeNode) => {
  newFolderParent.value = parent;
  showFolderModal.value = true;
};
</script>

<template>
  <div class="ghost-container drive-tree-container">
    <DriveDirectoryTreeHeader />

    <Tree
      :value="nodes"
      folding-transition-name="slide-fade"
    >
      <template #default="{ node, index, path, tree }">
        <component
          :is="node.isFolder ? DriveDirectoryTreeFolder : DriveDirectoryTreeFile"
          :node="node"
          :index="index"
          :path="path"
          :tree="tree"
          @create-child-folder="promptFolderName"
        />
      </template>
    </Tree>

    <va-modal
      v-model="showFolderModal"
      hide-default-actions
    >
      <h2 class="va-h2">
        New Folder
      </h2>
      <va-form
        tag="form"
        class="vertical-form table-form"
        @submit.prevent="createChildFolder"
      >
        <va-input
          v-model="newFolderName"
          name="title"
          label="Title"
          :min-length="1"
          :max-length="100"
          counter
          required
          autofocus
        />

        <div class="vertical-form__actions">
          <va-button
            preset="plain"
            color="secondary-dark"
            @click="cancel"
          >
            Cancel
          </va-button>
          <va-button
            preset="outlined"
            type="submit"
          >
            Create
          </va-button>
        </div>
      </va-form>
    </va-modal>
  </div>
</template>

<style scoped lang="scss">

</style>
