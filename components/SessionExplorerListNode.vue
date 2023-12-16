<script setup lang="ts">
import type { TableSessionPresence } from '~/models/types';

defineProps<{
  presence: TableSessionPresence
}>();

const sessionStore = useSessionStore();
</script>

<template>
  <div class="drive-node">
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      :disabled="!presence.enabled"
      preset="plain"
      title="Activate this session"
      @click="sessionStore.launchPrivateSession(presence)"
    >
      <div
        class="drive-node__name flex"
      >
        <SessionGroupIcon
          :group="presence"
        />
        {{ presence.displayName ?? presence.sessionId }}
      </div>
    </va-button>

    <div class="drive-node__actions">
      <div class="drive-node__hover-bar" />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
