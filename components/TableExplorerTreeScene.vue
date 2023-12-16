<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { Scene, TreeNode } from '~/models/types';
import { useExplorerItem } from '~/composables/useExplorerItem';

const props = defineProps<{
  node: TreeNode
  index: number
  path: number[]
  tree: Tree
}>();

const { item: scene } = useExplorerItem<Scene>(props.node);

const sceneStore = useSceneStore();
const sessionStore = useSessionStore();

const isActive = computed(() => {
  return sceneStore.scene?.id === scene.value?.id;
});

const sessionGroupsHere = computed(() => {
  return sessionStore.sessionGroups.filter(group =>
    group.sceneId === scene.value?.id,
  );
});

const handleSelect = () => {
  const tableStore = useTableStore();
  if (isActive.value || !tableStore.table || !scene.value || !tableStore.sessionId) {
    return;
  }

  tableStore.setActiveScene(tableStore.sessionId, scene.value.id, scene.value.path);
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
      :disabled="node.loading || !scene"
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
      >
        <SessionGroupIcon
          v-for="group in sessionGroupsHere"
          :key="group.groupId"
          :group="group"
        />

        {{ scene?.title ?? '[ NO DATA ]' }}
      </div>
    </va-button>

    <div v-if="scene" class="drive-node__actions">
      <TableExplorerTreeSceneContextMenu
        :node="node"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
