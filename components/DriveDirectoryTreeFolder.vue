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
  <div class="drive-node drive-node__folder">
    <div class="drive-node__icon">
      <va-icon
        :name="node.$folded ? 'folder' : 'folder_open'"
        color="primary"
        size="medium"
      />
    </div>
    <div class="drive-node__name">
      {{ node.label }}
    </div>
    <div class="drive-node__actions">
      <va-button-dropdown
        icon="more_vert"
        opened-icon="more_vert"
        preset="plain"
        color="primary"
        size="medium"
        stick-to-edges
      >
        <va-list class="drive-node__context-menu">
          <va-list-item
            href="#"
            @click.prevent
          >
            <va-list-item-section icon>
              <va-icon
                name="folder"
                color="primary"
                size="small"
              />
            </va-list-item-section>
            <va-list-item-section>
              <va-list-item-label caption>
                Create new folder
              </va-list-item-label>
            </va-list-item-section>
          </va-list-item>
        </va-list>
      </va-button-dropdown>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
