<script setup lang="ts">

</script>

<template>
  <div class="ghost-container">
    <VaSkeletonGroup>
      <VaSkeleton variant="squared" height="150px" />
      <va-card-content class="flex items-center">
        <VaSkeleton variant="text" :lines="1" />
      </va-card-content>
      <va-card-content>
        <VaSkeleton variant="text" :lines="2" text-width="50%" />
      </va-card-content>
      <va-card-actions align="right">
        <VaSkeleton variant="rounded" inline width="32px" height="32px" />
        <VaSkeleton class="ml-2" variant="rounded" inline width="64px" height="32px" />
      </va-card-actions>
    </VaSkeletonGroup>
  </div>
</template>

<style scoped lang="scss">

</style>
