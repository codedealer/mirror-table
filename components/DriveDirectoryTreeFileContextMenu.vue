<script setup lang="ts">
import type { DriveTreeNode } from '~/models/types';

const props = defineProps<{
  node: DriveTreeNode
  path: string[]
}>();

const { file } = useDriveFile(toRef(() => props.node.id));

const permissions = computed(() => ({
  canDelete: (
    file.value?.capabilities?.canDelete
  ),
}));

const trashFile = () => {
  const driveTreeStore = useDriveTreeStore();

  driveTreeStore.removeFile(props.node);
};
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
        v-show="permissions.canDelete"
        href="#"
        @click="trashFile"
      >
        <va-list-item-section icon>
          <va-icon
            name="delete"
            color="danger"
            size="small"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            Delete file
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
