<script setup lang="ts">
import type { TableSessionPresence } from '~/models/types';

const props = defineProps<{
  presence: TableSessionPresence
}>();

const sessionStore = useSessionStore();
const tableStore = useTableStore();

const screenFrameAvailable = computed(() => {
  return sessionStore.privateSessions.some(presence => presence.sessionId === props.presence.sessionId);
});

const screenFrameDataAvailable = computed(() => {
  return props.presence.screen && props.presence.screen.width > 0 && props.presence.screen.height > 0;
});

const toggleScreenFrame = () => {
  if (!screenFrameAvailable.value || !tableStore.table) {
    return;
  }
  const newSession = structuredClone(toRaw(props.presence));
  if (!newSession.screen) {
    // technically shouldn't happen
    console.warn('Trying to toggle screen frame on session without screen');
    return;
  }

  newSession.screen.enabled = !newSession.screen.enabled;
  tableStore.updateSessionPresence(tableStore.table.id, { [props.presence.sessionId]: newSession });
};

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
      <va-popover
        message="Screen frame will be displayed when session is active"
      >
        <va-icon
          v-show="screenFrameAvailable && !screenFrameDataAvailable && presence.screen?.enabled"
          name="warning"
          color="warning"
          size="small"
        />
      </va-popover>
      <va-button
        v-if="screenFrameAvailable"
        title="Toggle screen frame"
        :color="presence.screen?.enabled ? 'primary' : '#666'"
        preset="plain"
        :icon="presence.screen?.enabled ? 'visibility' : 'visibility_off'"
        size="small"
        round
        @click="toggleScreenFrame"
      />
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
</template>

<style scoped lang="scss">

</style>
