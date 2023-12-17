<script setup lang="ts">
import type { Category, TreeNode } from '~/models/types';
import { useExplorerItem } from '#imports';

const props = defineProps<{
  node: TreeNode
  path?: number[]
}>();

const MAX_DEPTH = 3;

const { item: category } = useExplorerItem<Category>(toRef(() => props.node));

const isEditable = computed(() => {
  if (!category.value) {
    return false;
  }

  const tableStore = useTableStore();
  if (!tableStore.table) {
    return false;
  }

  return tableStore.table.rootCategoryId !== category.value.id;
});

const createCategory = () => {
  const tableExplorerModalStore = useTableExplorerModalStore();
  tableExplorerModalStore.show(
    'category',
    'Create new category',
    props.node,
  );
};

const createScene = () => {
  const tableExplorerModalStore = useTableExplorerModalStore();
  tableExplorerModalStore.show(
    'scene',
    'Create new scene',
    props.node,
    undefined,
    undefined,
    props.path ?? [],
  );
};

const editCategory = () => {
  if (!category.value) {
    return;
  }

  const tableExplorerModalStore = useTableExplorerModalStore();
  tableExplorerModalStore.show(
    'category',
    'Edit category',
    props.node,
    category.value.title,
    props.node.id,
  );
};

const deleteCategory = () => {
  const notificationStore = useNotificationStore();
  notificationStore.error('Not implemented yet');
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
        v-if="path && path.length < MAX_DEPTH"
        href="#"
        @click="createCategory"
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
            Create new category
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>

      <va-list-item
        href="#"
        @click="createScene"
      >
        <va-list-item-section icon>
          <va-icon
            name="add_photo_alternate"
            color="primary"
            size="small"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            Create new scene
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>

      <va-list-item
        v-if="isEditable"
        href="#"
        @click="editCategory"
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
            Edit category
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>

      <va-list-item
        v-if="category?.deletable"
        href="#"
        @click="deleteCategory"
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
            Delete category
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
