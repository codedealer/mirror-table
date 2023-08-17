<script setup lang="ts">
import type { TableCard } from '~/models/types';

const props = defineProps<{ table: TableCard }>();

const notificationStore = useNotificationStore();
</script>

<template>
  <div class="ghost-container">
    <DriveThumbnail
      :file="table.thumbnail"
      width="300"
      height="150"
    />
    <TablesListElementTableContentOwner :table="table" />
  </div>
</template>

<style scoped lang="scss">

</style>
