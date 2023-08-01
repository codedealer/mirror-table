<script setup lang="ts">
useSeoMeta({
  title: 'Open with Drive',
});

const route = useRoute();
if (route.query.state) {
  const state = JSON.parse(route.query.state as string);
  console.log('state: ', state);
}
</script>

<template>
  <h1 class="va-h1">
    Consume Drive UI state
  </h1>
</template>

<style scoped lang="scss">

</style>
