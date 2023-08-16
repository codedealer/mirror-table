<script setup lang="ts">
import type { Table } from '~/models/types';

const props = defineProps<{ table: Table }>();
</script>

<template>
  <div class="ghost-container">
    <DriveThumbnail
      :file="table.thumbnail"
      width="300"
      height="150"
    />
    <va-card-title>{{ table.title }}</va-card-title>
    <va-card-content>
      <p v-if="table.lastAccess">
        Last launch: {{ table.lastAccess.toDate().toLocaleDateString() }}
      </p>
      <p v-else>
        <VaSkeleton variant="text" :lines="1" text-width="150px" />
      </p>
    </va-card-content>
    <va-card-actions align="right">
      <va-button
        icon="delete"
        preset="primary"
        color="danger"
      />
      <va-button
        preset="secondary"
        border-color="primary"
      >
        Launch
      </va-button>
    </va-card-actions>
  </div>
</template>

<style scoped lang="scss">

</style>
