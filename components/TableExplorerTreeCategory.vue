<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { Category, TreeNode } from '~/models/types';

const props = defineProps<{
  node: TreeNode
  index: number
  path: number[]
  tree: Tree
}>();

const tableExplorerStore = useTableExplorerStore();

const { item: category } = useExplorerItem<Category>(toRef(() => props.node));
</script>

<template>
  <div
    class="drive-node drive-node__folder"
  >
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      preset="plain"
      @click="tableExplorerStore.toggleCategory(node)"
    >
      <div class="drive-node__icon">
        <va-icon
          :name="node.$folded ? 'folder' : 'folder_open'"
          :class="node.loaded ? '' : 'drive-node__icon--undetermined'"
          color="primary"
          size="large"
        />
      </div>
      <div
        class="drive-node__name"
      >
        {{ category?.title ?? '[ NO DATA ]' }}
      </div>
    </va-button>

    <div v-if="category" class="drive-node__actions">
      <TableExplorerTreeCategoryContextMenu
        :node="node"
        :path="path"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
