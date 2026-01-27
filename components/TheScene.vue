<script setup lang="ts">
import TheSceneCanvas from '~/components/TheSceneCanvas.vue';
import TheSceneCanvasContextPanel from '~/components/TheSceneCanvasContextPanel.vue';
import TheSceneCanvasRightClickMenu from '~/components/TheSceneCanvasRightClickMenu.vue';
import TheSceneOverlay from '~/components/TheSceneOverlay.vue';
import TheSceneScreen from '~/components/TheSceneScreen.vue';

const sceneStore = useSceneStore();
</script>

<template>
  <div class="scene">
    <TheSceneCanvas v-if="sceneStore.scene" />

    <TheSceneScreen />

    <TheSceneCanvasContextPanel />

    <TheSceneCanvasRightClickMenu />

    <TheSceneOverlay />

    <TheSceneCanvasAssetLabelModal />

    <TheSceneCanvasTextEditModal />

    <TheSceneSearch />

    <TheSceneHotkeyModal />
  </div>
</template>

<style scoped lang="scss">

</style>
