<script setup lang="ts">
const sceneStore = useSceneStore();
</script>

<template>
  <div v-if="!sceneStore.scene" class="splash-screen-container" />
</template>

<style scoped lang="scss">

</style>
