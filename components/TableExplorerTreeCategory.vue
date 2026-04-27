<script setup lang="ts">
import type { Stat } from '@he-tree/tree-utils';
import type { Category, TreeNode } from '~/models/types';
import type { HeTreePublicInstance } from '~/utils/heTree';
import { explorerTreeRefKey } from '~/utils/heTree';

const props = defineProps<{
  node: TreeNode;
  stat: Stat<TreeNode>;
}>();

const tableExplorerStore = useTableExplorerStore();
const sceneStore = useSceneStore();

const treeRef = inject<Ref<HeTreePublicInstance<TreeNode> | null>>(explorerTreeRefKey, ref(null));

const { item: category } = useExplorerItem<Category>(toRef(() => props.node));

const { here: sessionGroupsHere } = useSessionGroupsHere(category);

const isActive = computed(() => {
  return sceneStore.scene?.path.includes(category.value?.id ?? '_');
});

const undoDeleteCategory = async () => {
  if (!category.value) {
    return;
  }

  const tableExplorerStore = useTableExplorerStore();

  tableExplorerStore.setNodeLoading(props.node, true);

  await tableExplorerStore.trashCategory(category.value, false);

  tableExplorerStore.setNodeLoading(props.node, false);
};

useHeTreeChildrenSync({
  node: toRef(() => props.node),
  stat: toRef(() => props.stat),
  tree: treeRef,
});

const handleToggle = async () => {
  if (props.stat.open) {
    // eslint-disable-next-line vue/no-mutating-props -- @he-tree/vue stat is designed to be mutated
    props.stat.open = false;
    return;
  }
  const result = await tableExplorerStore.toggleCategory(props.node);
  if (result) {
    // eslint-disable-next-line vue/no-mutating-props -- @he-tree/vue stat is designed to be mutated
    props.stat.open = true;
  }
};
</script>

<template>
  <div
    class="drive-node drive-node__folder"
  >
    <va-button
      :color="isActive ? 'primary' : 'text-primary'"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :disabled="!category || node.loading || category.deleted"
      preset="plain"
      @click="handleToggle"
    >
      <div class="drive-node__icon">
        <va-icon
          :name="stat.open ? 'folder_open' : 'folder'"
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

        <div class="text-overflow" :title="category?.title">
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
        :stat="stat"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
