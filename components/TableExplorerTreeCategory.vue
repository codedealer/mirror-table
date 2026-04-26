<script setup lang="ts">
import type { Stat } from '@he-tree/tree-utils';
import type { BaseTree } from '@he-tree/vue';
import type { Category, TreeNode } from '~/models/types';

const props = defineProps<{
  node: TreeNode;
  stat: Stat<TreeNode>;
}>();

const tableExplorerStore = useTableExplorerStore();
const sceneStore = useSceneStore();

const treeRef = inject<Ref<InstanceType<typeof BaseTree> | null>>('treeRef');

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

// Keep tree processor in sync when node children change (lazy load / reload)
watch(() => props.node.children, (newChildren) => {
  if (!newChildren)
    return;
  const proc = (treeRef?.value as any)?.processor;
  if (!proc)
    return;

  const newIds = new Set(newChildren.map((c: TreeNode) => c.id));
  // Remove stale stats (no longer present or stale object reference)
  for (const oldStat of [...props.stat.children]) {
    if (oldStat.parent === props.stat && (!newIds.has(oldStat.data.id) || !newChildren.includes(oldStat.data))) {
      proc.remove(oldStat);
    }
  }
  // Add stats for children not yet in the processor
  for (let i = 0; i < newChildren.length; i++) {
    if (!proc.has(newChildren[i])) {
      proc.add(newChildren[i], props.stat, i);
      continue;
    }

    const existingStat = proc.getStat(newChildren[i]);
    if (existingStat.parent !== props.stat) {
      proc.move(existingStat, props.stat, i);
    }
  }
}, { flush: 'sync' });

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
