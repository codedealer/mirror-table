<script setup lang="ts">
import type { Scene, TreeNode } from '~/models/types';
import { useSessionGroupsHere } from '~/composables/useSessionGroupsHere';

const props = defineProps<{
  node: TreeNode;
}>();

const { item: scene } = useExplorerItem<Scene>(toRef(() => props.node));

const { notHere: movableGroups, here } = useSessionGroupsHere(scene);

const sceneStore = useSceneStore();

const isActive = computed(() => {
  return sceneStore.scene?.id === scene.value?.id;
});

const isDeletable = computed(() => {
  if (!scene.value) {
    return false;
  }
  return scene.value.deletable && here.value.length === 0 && !isActive.value;
});

const DeleteSceneLabel = computed(() => {
  if (!scene.value) {
    return 'Not available';
  }

  if (!scene.value.deletable) {
    return 'Default scene';
  }

  return (here.value.length === 0 && !isActive.value) ? 'Delete scene' : 'Scene in use';
});

const moveGroup = (groupId: string) => {
  const tableStore = useTableStore();
  if (!scene.value || !tableStore.table || !tableStore.sessionId) {
    return;
  }

  tableStore.moveGroupToScene(groupId, scene.value);
};

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
  if (!scene.value) {
    return;
  }

  if (!isDeletable.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error('Cannot delete scene with viewers in it');
  }

  const tableExplorerStore = useTableExplorerStore();
  tableExplorerStore.trashScene(scene.value, true);
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
        v-for="group in movableGroups"
        :key="group.groupId!"
        href="#"
        @click="moveGroup(group.groupId!)"
      >
        <va-list-item-section icon>
          <SessionGroupIcon
            :group="group"
          />
        </va-list-item-section>
        <va-list-item-section>
          <va-list-item-label caption>
            {{ group.groupLabel ?? group.groupId }}
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>

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
        :disabled="!isDeletable"
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
            {{ DeleteSceneLabel }}
          </va-list-item-label>
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-button-dropdown>
</template>

<style scoped lang="scss">

</style>
