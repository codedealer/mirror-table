<script setup lang="ts">
import SessionControlPanelInvitePrompt from '~/components/SessionControlPanelInvitePrompt.vue';

const sessionStore = useSessionStore();
const hoverPanelStore = useHoverPanelStore();

let tries = 0;

watchEffect(() => {
  if (!sessionStore.ownSession?.sessionId || !sessionStore.emptyTable || tries > 0) {
    return;
  }

  // show the panel with the prompt to create a session
  hoverPanelStore.show(true);
  tries++;
});
</script>

<template>
  <va-card>
    <SessionControlPanelInvitePrompt v-if="sessionStore.emptyTable" />
  </va-card>
</template>

<style scoped lang="scss">

</style>
