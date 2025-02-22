<script setup lang="ts">
import type { TableSessionPresence } from '~/models/types';

const sessionStore = useSessionStore();
const tableStore = useTableStore();
const { privateSessions } = storeToRefs(sessionStore);

const toggleScreenFrames = async () => {
  if (!tableStore.table) {
    return;
  }
  const newSessions = JSON.parse(JSON.stringify(toValue(privateSessions))) as unknown as TableSessionPresence[];
  if (!newSessions) {
    return;
  }

  const sessions: { [sessionId: string]: TableSessionPresence } = {};
  newSessions.forEach((presence) => {
    if (!presence.screen) {
      // technically shouldn't happen
      console.warn('Trying to toggle screen frame on session without screen');
      return;
    }
    presence.screen.enabled = !presence.screen.enabled;
    sessions[presence.sessionId] = presence;
  });

  try {
    await tableStore.updateSessionPresence(tableStore.table.id, sessions);
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error('Failed to update screen frame');
  }
};
</script>

<template>
  <va-card-block
    horizontal
  >
    <va-card-content class="flex gap-05">
      <va-popover
        message="Toggle screen frames"
      >
        <va-button
          icon="visibility"
          color="primary"
          preset="primary"
          @click="toggleScreenFrames"
        />
      </va-popover>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
