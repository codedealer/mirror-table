<script setup lang="ts">
import TheSceneCanvas from '~/components/TheSceneCanvas.vue';
import TheSceneSplashScreen from '~/components/TheSceneSplashScreen.vue';
import TheSceneOverlay from '~/components/TheSceneOverlay.vue';
import TheSceneCanvasContextPanel from '~/components/TheSceneCanvasContextPanel.vue';

const sceneStore = useSceneStore();
</script>

<template>
  <div class="scene">
    <TheSceneCanvas v-if="sceneStore.scene" />

    <TheSceneSplashScreen />

    <TheSceneCanvasContextPanel />

    <TheSceneOverlay />

    <TheSceneCanvasAssetLabelModal />
  </div>
</template>

<style scoped lang="scss">

</style>
