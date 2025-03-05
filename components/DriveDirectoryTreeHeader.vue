<script setup lang="ts">
import { useDriveFolderContextActions } from '~/composables/useDriveFolderContextActions';

const driveTreeStore = useDriveTreeStore();

const setRoot = () => {
  driveTreeStore.setRootFolder();
};

const { file } = useDriveFile(
  toRef(() => driveTreeStore.rootNode.id),
  {
    strategy: DataRetrievalStrategies.LAZY,
  },
);

const { actions } = useDriveFolderContextActions(
  file,
  toRef(() => driveTreeStore.rootNode),
  toRef(() => undefined),
);
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
          message="Search (SHIFT + F)"
        >
          <va-button
            preset="plain"
            color="primary"
            size="medium"
            @click="driveTreeStore.showSearchModal()"
          >
            <div class="drive-node__icon">
              <va-icon
                name="search"
                color="primary-dark"
                size="medium"
                class="drive-node__icon"
              />
            </div>
          </va-button>
        </va-popover>

        <ContextPanel
          v-show="file && !file.trashed"
          :actions="actions"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
