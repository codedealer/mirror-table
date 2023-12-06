<script setup lang="ts">
import type { DriveTreeNode } from '~/models/types';
import { generateSelectOptions } from '~/models/AssetProperties';

const props = defineProps<{
  node: DriveTreeNode
  path?: string[]
  header?: boolean
}>();

const tableStore = useTableStore();
const driveTreeStore = useDriveTreeStore();

const permissions = computed(() => ({
  canAddChildren: (
    driveTreeStore.isRootFolder
      ? tableStore.permissions.isOwner
      : props.node?.data?.capabilities?.canAddChildren
  ),
  canDelete: (
    props.header
      ? false
      : props.node?.data?.capabilities?.canDelete
  ),
}));

const trashFolder = () => {
  driveTreeStore.removeFile(props.node);
};

const createChildFolder = () => {
  const driveTreeModalStore = useDriveTreeModalStore();

  driveTreeModalStore.show('New folder', DriveMimeTypes.FOLDER, props.node, props.path);
};

const createAsset = () => {
  const driveTreeModalStore = useDriveTreeModalStore();

  driveTreeModalStore.show(
    'New asset',
    DriveMimeTypes.MARKDOWN,
    props.node,
    props.path,
    generateSelectOptions(),
  );
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
        @click="createChildFolder"
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
        v-if="permissions.canAddChildren"
        href="#"
        @click="createAsset"
      >
        <va-list-item-section icon>
          <va-icon
            name="library_add"
            color="primary"
            size="small"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            Create new asset
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>

      <va-list-item
        v-if="permissions.canDelete"
        href="#"
        @click="trashFolder"
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
            Delete folder
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
