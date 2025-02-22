<script setup lang="ts">
import TheSceneCanvas from '~/components/TheSceneCanvas.vue';
import TheSceneScreen from '~/components/TheSceneScreen.vue';
import TheSceneOverlay from '~/components/TheSceneOverlay.vue';
import TheSceneCanvasContextPanel from '~/components/TheSceneCanvasContextPanel.vue';

const sceneStore = useSceneStore();
</script>

<template>
  <div class="scene">
    <TheSceneCanvas v-if="sceneStore.scene" />

    <TheSceneScreen />

    <TheSceneCanvasContextPanel />

    <TheSceneOverlay />

    <TheSceneCanvasAssetLabelModal />

    <TheSceneSearch />

    <TheSceneHotkeyModal />
  </div>
</template>

<style scoped lang="scss">

</style>
