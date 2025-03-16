<script setup lang="ts">
const canvasStageStore = useCanvasStageStore();

onBeforeMount(() => {
  canvasStageStore.imageTransformer && canvasStageStore.imageTransformer.nodes([]);
});
</script>

<template>
  <div class="canvas-tool-bar" />
</template>

<style scoped lang="scss">

</style>
