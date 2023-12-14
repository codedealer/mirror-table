<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { Scene, TreeNode } from '~/models/types';
import { useExplorerItem } from '~/composables/useExplorerItem';

const props = defineProps<{
  node: TreeNode
  index: number
  path: string[]
  tree: Tree
}>();

const { item: scene } = useExplorerItem<Scene>(props.node);
</script>

<template>
  <div class="drive-node drive-node__file">
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :loading="node.loading"
      :disabled="node.loading || !scene"
      preset="plain"
    >
      <div class="drive-node__icon">
        <va-icon
          name="image"
          size="large"
          color="primary"
        />
      </div>
      <div
        class="drive-node__name"
      >
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
