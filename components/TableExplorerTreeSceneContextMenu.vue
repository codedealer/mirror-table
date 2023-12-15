<script setup lang="ts">
import type { Scene, TreeNode } from '~/models/types';

const props = defineProps<{
  node: TreeNode
}>();

const { item: scene } = useExplorerItem<Scene>(props.node);

const editScene = () => {
  if (!scene.value) {
    return;
  }

  const tableExplorerModalStore = useTableExplorerModalStore();
  tableExplorerModalStore.show(
    'scene',
    'Edit scene',
    props.node,
    scene.value.title,
    props.node.id,
  );
};

const deleteScene = () => {
  const notificationStore = useNotificationStore();
  notificationStore.error('This needs revisiting to check that we don\'t delete the scene with viewers in it.');
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
        href="#"
        @click="editScene"
      >
        <va-list-item-section icon>
          <va-icon
            name="edit"
            color="primary"
            size="small"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            Edit scene
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>

      <va-list-item
        :disabled="!scene?.deletable"
        href="#"
        @click="deleteScene"
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
            {{ scene?.deletable ? 'Delete scene' : 'Default scene' }}
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
