<script setup lang="ts">
const tableExplorerStore = useTableExplorerStore();
</script>

<template>
  <div class="explorer">
    <div v-if="tableExplorerStore.isReady" class="explorer-content">
      <LazyTableExplorerTree />
    </div>
    <div v-show="!tableExplorerStore.isReady" class="explorer-skeleton">
      <VaSkeletonGroup animation="wave">
        <div class="explorer-skeleton-header mb">
          <va-skeleton variant="rounded" inline width="64px" height="32px" />
          <va-skeleton variant="rounded" inline width="64px" height="32px" />
        </div>
        <div class="explorer-skeleton-content">
          <va-skeleton variant="rounded" height="32px" />
          <va-skeleton variant="rounded" height="32px" />
          <va-skeleton variant="rounded" height="32px" />
        </div>
      </VaSkeletonGroup>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
