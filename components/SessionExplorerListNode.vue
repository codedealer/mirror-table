<script setup lang="ts">
import type { TableSessionPresence } from '~/models/types';

defineProps<{
  presence: TableSessionPresence
}>();

const sessionStore = useSessionStore();

const removeSession = (presence: TableSessionPresence) => {
  const tableStore = useTableStore();

  tableStore.removeViewer(presence.sessionId);
};
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
      <div class="drive-node__hover-bar">
        <va-button
          title="Delete Session"
          preset="plain"
          color="danger"
          icon="delete"
          size="small"
          round
          @click="removeSession(presence)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
