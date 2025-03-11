<script setup lang="ts">
const sessionStore = useSessionStore();
</script>

<template>
  <div class="ghost-container">
    <SessionControlPanelOwnModeSceneWatchdog />
    <SessionControlPanelOwnModeScreenFrameControl v-if="!sessionStore.emptyTable" />
    <SessionControlPanelOwnModeHiddenLayerControl />
    <SessionControlPanelOwnModePanelControl />
    <SessionControlPanelOwnModeFullscreenControl />
  </div>
</template>

<style scoped lang="scss">

</style>
