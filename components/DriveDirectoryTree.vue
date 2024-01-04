<script setup lang="ts">
import { Fold, Tree as NakedTree } from 'he-tree-vue';
import { DriveDirectoryTreeFile, DriveDirectoryTreeFolder } from '#components';

const Tree = NakedTree.mixPlugins([
  Fold,
]);

const driveTreeStore = useDriveTreeStore();

const { nodes } = storeToRefs(driveTreeStore);
</script>

<template>
  <div class="ghost-container drive-tree-container">
    <DriveDirectoryTreeHeader />

    <va-scroll-container vertical>
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
          />
        </template>
      </Tree>
    </va-scroll-container>

    <DriveDirectoryTreeModal />
  </div>
</template>

<style scoped lang="scss">

</style>
