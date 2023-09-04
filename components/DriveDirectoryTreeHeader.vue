<script setup lang="ts">
import type { DriveTreeNode } from '~/models/types';

interface DriveDirectoryTreeHeaderEmits {
  (event: 'createChildFolder', node: DriveTreeNode, path: string[]): void
}

defineEmits<DriveDirectoryTreeHeaderEmits>();

const driveTreeStore = useDriveTreeStore();

const setRoot = () => {
  driveTreeStore.setRootFolder();
};

const setRootToParent = () => {
  driveTreeStore.setRootToParent();
};
</script>

<template>
  <div class="drive-directory-tree-header">
    <div class="drive-directory-tree-header__content">
      <div class="drive-directory-tree-header__root-nav">
        <va-popover
          message="Go to root folder"
        >
          <va-button
            preset="plain"
            color="primary"
            size="medium"
            :loading="driveTreeStore.rootNode.loading"
            :disabled="driveTreeStore.rootNode.disabled"
            @click="setRoot"
          >
            <div class="drive-node__icon">
              <va-icon
                name=""
                color="primary"
                size="medium"
                class="drive-node__icon root-icon"
              />
            </div>
          </va-button>
        </va-popover>
      </div>
      <div
        v-show="!driveTreeStore.isRootFolder"
        class="drive-directory-tree-header__folder-title"
        :title="driveTreeStore.rootNode.label"
      >
        <va-icon
          name="double_arrow"
          color="background-border"
          size="small"
          style="vertical-align: bottom;"
        />
        {{ driveTreeStore.rootNode.label }}
      </div>
      <div class="drive-directory-tree-header__actions">
        <va-popover
          message="Go to parent folder"
          stick-to-edges
        >
          <va-button
            v-show="!driveTreeStore.isRootFolder"
            preset="plain"
            color="primary-dark"
            size="medium"
            :loading="driveTreeStore.rootNode.loading"
            :disabled="driveTreeStore.rootNode.disabled"
            @click="setRootToParent"
          >
            <div class="drive-node__icon">
              <va-icon
                name="drive_folder_upload"
                color="primary-dark"
                size="medium"
                class="drive-node__icon"
              />
            </div>
          </va-button>
        </va-popover>

        <DriveDirectoryTreeFolderContextMenu
          :node="driveTreeStore.rootNode"
          header
          @create-child-folder="$emit('createChildFolder', driveTreeStore.rootNode, [])"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
