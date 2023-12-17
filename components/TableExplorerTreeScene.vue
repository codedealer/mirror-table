<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { Scene, TreeNode } from '~/models/types';
import { useExplorerItem } from '~/composables/useExplorerItem';
import { useSessionGroupsHere } from '~/composables/useSessionGroupsHere';

const props = defineProps<{
  node: TreeNode
  index: number
  path: number[]
  tree: Tree
}>();

const { item: scene } = useExplorerItem<Scene>(toRef(() => props.node));

const sceneStore = useSceneStore();

const isActive = computed(() => {
  return sceneStore.scene?.id === scene.value?.id;
});

const { here: sessionGroupsHere } = useSessionGroupsHere(scene);

const moveAllViewersHere = () => {
  if (!scene.value) {
    return;
  }

  const tableStore = useTableStore();
  tableStore.moveAllViewersToScene(scene.value);
};

const handleSelect = () => {
  const tableStore = useTableStore();
  if (isActive.value || !tableStore.table || !scene.value || !tableStore.sessionId) {
    return;
  }

  tableStore.setActiveScene(tableStore.sessionId, scene.value);
};

const undoDeleteScene = () => {
  if (!scene.value) {
    return;
  }

  const tableExplorerStore = useTableExplorerStore();
  tableExplorerStore.trashScene(scene.value, false);
};
</script>

<template>
  <div
    :class="{ 'drive-node__active': isActive }"
    class="drive-node drive-node__file"
  >
    <va-button
      :color="isActive ? 'primary' : 'text-primary'"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :loading="node.loading"
      :disabled="node.loading || !scene || scene.deleted"
      preset="plain"
      @click="handleSelect"
    >
      <div class="drive-node__icon">
        <va-icon
          name="image"
          size="large"
          color="primary"
        />
      </div>
      <div
        class="drive-node__name flex"
        :class="scene?.deleted ? 'drive-node__name--trashed' : ''"
      >
        <SessionGroupIcon
          v-for="group in sessionGroupsHere"
          :key="group.groupId!"
          :group="group"
        />

        <div class="text-overflow">
          {{ scene?.title ?? '[ NO DATA ]' }}
        </div>
      </div>
    </va-button>

    <div v-if="scene" class="drive-node__actions">
      <va-popover
        message="Undo"
        stick-to-edges
      >
        <va-button
          v-show="scene.deleted"
          preset="plain"
          color="primary-dark"
          size="medium"
          icon="replay"
          @click.stop="undoDeleteScene"
        />
      </va-popover>

      <div
        v-show="!scene.deleted"
        class="drive-node__hover-bar"
      >
        <va-button
          title="Move all viewers here"
          preset="plain"
          color="primary"
          icon="system_update_alt"
          size="small"
          round
          @click="moveAllViewersHere"
        />
      </div>

      <TableExplorerTreeSceneContextMenu
        v-show="!scene.deleted"
        :node="node"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
