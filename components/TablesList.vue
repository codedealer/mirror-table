<script setup lang="ts">
const tableStore = useTableStore();
</script>

<template>
  <div class="tables-list-container">
    <div class="tables-list">
      <TablesListElement>
        <TablesListElementNew />
      </TablesListElement>
      <TablesListElement>
        <TablesListElementTable />
      </TablesListElement>
    </div>
  </div>
</template>
