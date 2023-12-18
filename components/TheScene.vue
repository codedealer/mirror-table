<script setup lang="ts">
import TheSceneCanvas from '~/components/TheSceneCanvas.vue';
import TheSceneSplashScreen from '~/components/TheSceneSplashScreen.vue';
import TheSceneOverlay from '~/components/TheSceneOverlay.vue';

const sceneStore = useSceneStore();
</script>

<template>
  <div class="scene">
    <TheSceneCanvas v-if="sceneStore.scene" />

    <TheSceneSplashScreen />

    <TheSceneOverlay />
  </div>
</template>

<style scoped lang="scss">

</style>
