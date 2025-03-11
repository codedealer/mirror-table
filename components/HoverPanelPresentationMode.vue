<script setup lang="ts">
const sessionStore = useSessionStore();
const hoverPanelStore = useHoverPanelStore();

onMounted(() => {
  hoverPanelStore.requestManual('presentation-mode');
});

onUnmounted(() => {
  hoverPanelStore.dismissManual('presentation-mode');
});
</script>

<template>
  <va-card>
    <va-card-block horizontal>
      <va-card-content v-if="sessionStore.activeSession" class="flex gap-05">
        <SessionGroupIcon
          :group="sessionStore.activeSession"
        />
        {{ sessionStore.activeSession.displayName ?? sessionStore.activeSession.sessionId }}
      </va-card-content>
    </va-card-block>
    <SessionControlPanelOwnModeFullscreenControl />
    <va-card-block v-show="hoverPanelStore.mode === HoverPanelModes.MANUAL" horizontal>
      <va-divider vertical />
      <va-card-content class="centered">
        <va-button
          preset="plain"
          color="text-primary"
          @click="hoverPanelStore.forceAuto()"
        >
          Dismiss
        </va-button>
      </va-card-content>
    </va-card-block>
  </va-card>
</template>

<style scoped lang="scss">

</style>
