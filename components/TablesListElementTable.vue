<script setup lang="ts">
import type { Table } from '~/models/types';

const props = defineProps<{ table: Table }>();

const { file, error, isLoading } = useDriveFile(props.table.thumbnail);
</script>

<template>
  <div class="ghost-container">
    <DriveThumbnail
      :file="file"
      :error="error"
      :file-is-loading="isLoading"
      width="300"
      height="150"
    />
    <va-card-title>{{ table.title }}</va-card-title>
    <va-card-content>
      <p>Last launch: {{ table.lastAccess.toDate().toLocaleDateString() }}</p>
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
