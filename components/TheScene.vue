<script setup lang="ts">
const sceneStore = useSceneStore();
</script>

<template>
  <h1 class="va-h1">
    {{ sceneStore.scene?.title }}
  </h1>
</template>

<style scoped lang="scss">

</style>
