<script setup lang="ts">
import { TableExplorerTreeCategory, TableExplorerTreeScene } from '#components';
import { Fold, Tree as NakedTree } from 'he-tree-vue';

const Tree = NakedTree.mixPlugins([
  Fold,
]);

const tableExplorerStore = useTableExplorerStore();
</script>

<template>
  <div class="drive-tree-container explorer-tree-container">
    <TableExplorerTreeHeader />

    <Tree
      :value="tableExplorerStore.nodes"
      folding-transition-name="slide-fade"
    >
      <template #default="{ node, index, path, tree }">
        <component
          :is="node.isFolder ? TableExplorerTreeCategory : TableExplorerTreeScene"
          :node="node"
          :index="index"
          :path="path"
          :tree="tree"
        />
      </template>
    </Tree>

    <TableExplorerTreeModal />
  </div>
</template>

<style scoped lang="scss">

</style>
