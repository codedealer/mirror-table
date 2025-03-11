<script setup lang="ts">
import SessionControlPanelInvitePrompt from '~/components/SessionControlPanelInvitePrompt.vue';

const sessionStore = useSessionStore();
</script>

<template>
  <va-card>
    <SessionControlPanelInvitePrompt v-if="sessionStore.emptyTable" />
    <SessionControlPanelOwnMode v-else />
  </va-card>
</template>

<style scoped lang="scss">

</style>
