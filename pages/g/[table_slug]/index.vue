<script setup lang="ts">
import { useTitle } from '@vueuse/core';
import { TableModes } from '~/models/types';

useSeoMeta({
  title: 'Table Session',
  ogTitle: 'Table Session',
});

definePageMeta({
  layout: 'table',
});

const tableStore = useTableStore();
const metaTitle = useTitle();
onMounted(() => {
  const route = useRoute();
  tableStore.tableSlug = Array.isArray(route.params.table_slug)
    ? route.params.table_slug[0]
    : route.params.table_slug;

  watchEffect(() => {
    if (!tableStore.table) {
      return;
    }

    metaTitle.value = tableStore.table.title;
  });

  watchEffect(() => {
    if (tableStore.mode === TableModes.INVALID) {
      return navigateTo('/dashboard');
    }
  });
});
</script>

<template>
  <div class="scene-container" />
</template>

<style scoped lang="scss">

</style>
