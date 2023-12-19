<script setup lang="ts">
import type { DriveTreeNode } from '~/models/types';
import { useDriveFileContextActions } from '~/composables/useDriveFileContextActions';

const props = defineProps<{
  node: DriveTreeNode
  path: number[]
}>();

const { file } = useDriveFile(toRef(() => props.node.id));

const { actions } = useDriveFileContextActions(file, toRef(() => props.node));
</script>

<template>
  <va-button-dropdown
    icon="more_vert"
    opened-icon="more_vert"
    preset="plain"
    color="primary-dark"
    size="medium"
    stick-to-edges
    @click.stop
  >
    <va-list class="drive-node__context-menu">
      <va-list-item
        v-for="action in actions"
        :key="action.label"
        :disabled="action.disabled"
        href="#"
        @click="action.action"
      >
        <va-list-item-section icon>
          <va-icon
            v-if="action.icon"
            :name="action.icon.name"
            :color="action.icon?.color ?? 'primary-dark'"
            size="small"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            {{ action.label }}
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
