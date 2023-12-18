<script setup lang="ts">
const sceneStore = useSceneStore();
</script>

<template>
  <div v-if="!sceneStore.scene" class="scene-overlay" />
</template>

<style scoped lang="scss">

</style>
