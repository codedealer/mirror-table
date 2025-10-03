<script setup lang="ts">
import type { TableCard } from '~/models/types';

const props = defineProps<{ table: TableCard }>();

const notificationStore = useNotificationStore();
const tableStore = useTableStore();

const _removeTable = async () => {
  // eslint-disable-next-line no-alert
  const confirmed = confirm('Are you sure you want to delete this table?');
  if (!confirmed) {
    return;
  }

  await tableStore.remove(props.table.id);
  notificationStore.success('Table deleted');
};
</script>

<template>
  <div class="ghost-container">
    <va-card-title>
      <p v-if="table.lastAccess">
        Last launch: {{ table.lastAccess.toDate().toLocaleDateString() }}
      </p>
      <p v-else>
        <VaSkeleton variant="text" :lines="1" text-width="150px" />
      </p>
    </va-card-title>
    <va-card-content>
      <p class="card-name">
        {{ table.title }}
      </p>
      <p>
        <va-popover message="This table can only be accessed from your account">
          <va-chip square size="small" color="background-border">
            <va-icon name="lock" size="small" class="mr-2" />
            private
          </va-chip>
        </va-popover>
      </p>
    </va-card-content>
    <va-card-actions align="right">
      <va-popover message="Delete Table">
        <va-button
          icon="delete"
          preset="primary"
          color="danger"
          @click="notificationStore.error('Deletion is currently not supported')"
        />
      </va-popover>
      <va-popover message="Invite viewers">
        <va-button
          preset="primary"
          color="secondary"
          icon="person_add"
          @click="notificationStore.error('Invitations are currently not supported')"
        />
      </va-popover>
      <va-button
        preset="outlined"
        tag="NuxtLink"
        :to="`/g/${table.slug}`"
      >
        Launch
      </va-button>
    </va-card-actions>
  </div>
</template>

<style scoped lang="scss">

</style>
