<script setup lang="ts">
import type { DriveTreeNode } from '~/models/types';

interface DriveDirectoryTreeFolderContextMenuEmits {
  (event: 'createChildFolder', node: DriveTreeNode): void
}

const props = defineProps<{
  node: DriveTreeNode
  header?: boolean
}>();

defineEmits<DriveDirectoryTreeFolderContextMenuEmits>();

const tableStore = useTableStore();
const driveTreeStore = useDriveTreeStore();

const permissions = computed(() => ({
  canAddChildren: (
    driveTreeStore.isRootFolder
      ? tableStore.permissions.isOwner
      : props.node?.data?.capabilities?.canAddChildren
  ),
  canDelete: (
    driveTreeStore.isRootFolder
      ? false
      : !props.header && props.node?.data?.capabilities?.canDelete
  ),
}));

const trashFolder = () => {
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
        v-show="permissions.canAddChildren"
        href="#"
        @click="$emit('createChildFolder', node)"
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

      <va-list-item
        v-show="permissions.canDelete"
        href="#"
        @click="trashFolder"
      >
        <va-list-item-section icon>
          <va-icon
            name="delete"
            color="primary"
            size="small"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            Delete folder
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
