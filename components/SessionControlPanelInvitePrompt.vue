<script setup lang="ts">
const hoverPanelStore = useHoverPanelStore();
const sessionStore = useSessionStore();

let isPrompted = 0;

watchEffect(() => {
  if (!sessionStore.activeSessionId || !sessionStore.emptyTable || isPrompted > 0) {
    return;
  }

  // show the panel with the prompt to create a session
  hoverPanelStore.requestManual('invite-prompt');
  isPrompted++;
});

onUnmounted(() => {
  hoverPanelStore.dismissManual('invite-prompt');
});

const openSessionExplorer = () => {
  const dynamicPanelStore = useDynamicPanelStore();
  dynamicPanelStore.open(
    DynamicPanelModelTypes.LEFT,
    DynamicPanelContentTypes.SESSIONS,
    true,
  );

  hoverPanelStore.forceAuto();
};
</script>

<template>
  <div class="ghost-container">
    <va-card-block
      horizontal
    >
      <va-card-content class="centered">
        <p class="session-prompt">
          Looks like there are no viewers at your table. Create a new session when you're ready.
        </p>
      </va-card-content>
    </va-card-block>
    <va-divider vertical />
    <va-card-block>
      <va-card-content class="centered">
        <va-popover message="Create Session" placement="right">
          <va-button
            preset="plain"
            @click="openSessionExplorer"
          >
            <img src="/logo.png" alt="logo" width="24" height="24">
          </va-button>
        </va-popover>
      </va-card-content>

      <va-divider />

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
  </div>
</template>

<style scoped lang="scss">

</style>
