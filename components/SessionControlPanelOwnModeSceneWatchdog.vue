<script setup lang="ts">
import type { BaseScene } from '~/models/types';

const sessionStore = useSessionStore();
const hoverPanelStore = useHoverPanelStore();
const tableStore = useTableStore();

const sceneMismatch = computed(() => {
  return sessionStore.viewerSessions.some((session) => {
    return session.sceneId !== sessionStore.activeSession?.sceneId;
  });
});

watchEffect(() => {
  if (sceneMismatch.value) {
    hoverPanelStore.requestManual('scene-watchdog');
  } else {
    hoverPanelStore.dismissManual('scene-watchdog');
  }
});

onUnmounted(() => {
  hoverPanelStore.dismissManual('scene-watchdog');
});

const moveAllHere = () => {
  if (!sessionStore.activeSession) {
    return;
  }

  const scene: BaseScene = {
    id: sessionStore.activeSession.sceneId,
    path: sessionStore.activeSession.path,
  };

  tableStore.moveAllViewersToScene(scene);
};

const goToScene = () => {
  if (
    !sessionStore.viewerSessions.length
    || !sessionStore.activeSessionId
  ) {
    return;
  }

  const allSessionIds = sessionStore.viewerSessions.map(s => s.sessionId);
  allSessionIds.push(sessionStore.activeSessionId);

  const scene: BaseScene = {
    id: sessionStore.viewerSessions[0].sceneId,
    path: sessionStore.viewerSessions[0].path,
  };

  tableStore.setActiveScene(allSessionIds, scene);
};
</script>

<template>
  <va-card-block
    v-show="sceneMismatch"
    horizontal
  >
    <va-card-content class="flex gap-05">
      <va-popover
        message="There are viewers in different scene"
      >
        <va-icon
          name="warning"
          color="warning"
        />
      </va-popover>

      <va-button-group
        preset="primary"
      >
        <va-popover
          :hover-over-timeout="1000"
          message="Bring everyone to this scene"
        >
          <va-button
            icon="system_update_alt"
            color="primary"
            @click="moveAllHere"
          />
        </va-popover>

        <va-popover
          :hover-over-timeout="1000"
          message="Go to another scene"
        >
          <va-button
            icon="arrow_forward"
            color="secondary"
            @click="goToScene"
          />
        </va-popover>
      </va-button-group>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
