<script setup lang="ts">
import type { Stat } from '@he-tree/tree-utils';
import type { TreeNode } from '~/models/types';
import { TableExplorerTreeCategory, TableExplorerTreeScene } from '#components';
import { BaseTree } from '@he-tree/vue';
import '@he-tree/vue/style/default.css';

const tableExplorerStore = useTableExplorerStore();

const { nodes } = storeToRefs(tableExplorerStore);

const treeRef = ref<InstanceType<typeof BaseTree> | null>(null);
provide('treeRef', treeRef);
</script>

<template>
  <div class="drive-tree-container explorer-tree-container">
    <TableExplorerTreeHeader />

    <BaseTree
      ref="treeRef"
      v-model="nodes"
      :default-open="false"
      :indent="20"
      :watermark="false"
      children-key="children"
    >
      <template #default="{ node, stat }: { node: TreeNode, stat: Stat<TreeNode> }">
        <component
          :is="node.isFolder ? TableExplorerTreeCategory : TableExplorerTreeScene"
          :node="node"
          :stat="stat"
        />
      </template>
    </BaseTree>

    <TableExplorerTreeModal />
  </div>
</template>

<style scoped lang="scss">

</style>
