<script setup lang="ts">
import type { Tree } from 'he-tree-vue';
import type { DriveTreeNode } from '~/models/types';

const props = defineProps<{
  node: DriveTreeNode
  index: number
  path: string[]
  tree: Tree
}>();
</script>

<template>
  <div class="drive-node drive-node__file">
    <div class="drive-node__icon">
      <va-icon
        name="article"
        size="large"
        color="primary"
      />
    </div>
    <div class="drive-node__name">
      {{ node.label }}
    </div>
    <div class="drive-node__actions" />
  </div>
</template>

<style scoped lang="scss">

</style>
