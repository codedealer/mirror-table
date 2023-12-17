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

const { here: sessionGroupsHere } = useSessionGroupsHere(category);

const undoDeleteCategory = async () => {
  if (!category.value) {
    return;
  }

  const tableExplorerStore = useTableExplorerStore();

  tableExplorerStore.setNodeLoading(props.node, true);

  await tableExplorerStore.trashCategory(category.value, false);

  tableExplorerStore.setNodeLoading(props.node, false);
};
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
      :disabled="!category || node.loading || category.deleted"
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
        class="drive-node__name flex"
        :class="category?.deleted ? 'drive-node__name--deleted' : ''"
      >
        <SessionGroupIcon
          v-for="group in sessionGroupsHere"
          :key="group.groupId!"
          :group="group"
          alt
        />

        <div class="text-overflow">
          {{ category?.title ?? '[ NO DATA ]' }}
        </div>
      </div>
    </va-button>

    <div v-if="category" class="drive-node__actions">
      <va-popover
        message="Undo"
        stick-to-edges
      >
        <va-button
          v-show="category.deleted"
          preset="plain"
          color="primary-dark"
          size="medium"
          icon="replay"
          @click.stop="undoDeleteCategory"
        />
      </va-popover>

      <TableExplorerTreeCategoryContextMenu
        v-if="!category.deleted"
        :node="node"
        :path="path"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
