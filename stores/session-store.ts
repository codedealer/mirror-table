import { LOCAL_GROUP_ID_PREFIX, LOCAL_NAME_PREFIX } from '~/models/TableSessionPresence';
import type { SessionGroup, TableSessionPresence } from '~/models/types';

export const useSessionStore = defineStore('session', () => {
  const tableStore = useTableStore();

  /**
   * This is the true session (table owner or an invited viewer)
   */
  const ownSession = computed(() => {
    if (
      !tableStore.table ||
      !tableStore.sessionId ||
      !Object.hasOwn(tableStore.table.session, tableStore.sessionId)
    ) {
      return undefined;
    }

    return tableStore.table.session[tableStore.sessionId];
  });

  const activeSessionId = computed(() => {
    return tableStore.sessionOverride ?? tableStore.sessionId;
  });

  /**
   * This is the session that is currently being viewed (possibly in presentation mode)
   */
  const activeSession = computed(() => {
    if (
      !tableStore.table ||
      !activeSessionId.value ||
      !Object.hasOwn(tableStore.table.session, activeSessionId.value)
    ) {
      return undefined;
    }

    return tableStore.table.session[activeSessionId.value];
  });

  const viewerSessions = computed(() => {
    if (!tableStore.table || !tableStore.sessionId) {
      return [];
    }

    return (({ [tableStore.sessionId]: _, ...viewers }) => Object.values(viewers))(tableStore.table.session);
  });

  const privateSessions = computed(() => {
    return viewerSessions.value.filter(session => session.groupId?.startsWith(LOCAL_GROUP_ID_PREFIX));
  });

  const sessionGroups = computed(() => {
    const groups: SessionGroup[] = [];

    viewerSessions.value.forEach((session) => {
      const group = groups.find(
        g => g.groupId === session.groupId,
      );
      if (!group) {
        groups.push({
          groupId: session.groupId,
          groupLabel: session.groupLabel,
          color: session.color,
          sceneId: session.sceneId,
          path: session.path,
          enabled: session.enabled,
        });
      }
    });

    return groups;
  });

  const emptyTable = computed(() => {
    return viewerSessions.value.length === 0;
  });

  const createPrivateSession = async () => {
    const sceneStore = useSceneStore();
    if (!sceneStore.scene || !tableStore.table) {
      return;
    }

    const privateSessionNames = privateSessions.value.map(session => session.displayName);
    // generate a new name by taking the largest number in names of the form "Presentation #" and adding 1
    const newPrivateSessionName = `${LOCAL_NAME_PREFIX} ${Math.max(0, ...privateSessionNames.map((name) => {
      const match = name.match(/Presentation (\d+)/);
      if (match) {
        return Number(match[1]);
      }
      return 0;
    })) + 1}`;
    // generate a new group id by taking the largest number in group ids of the form "local#"
    const privateSessionGroupIds = privateSessions.value.map(session => session.groupId);
    const newPrivateSessionGroupId = `${LOCAL_GROUP_ID_PREFIX}${Math.max(0, ...privateSessionGroupIds.map((groupId) => {
      const match = groupId!.match(/local(\d+)/);
      if (match) {
        return Number(match[1]);
      }
      return 0;
    })) + 1}`;

    const newPrivateSessionPresence = TableSessionPresenceFactory(
      newPrivateSessionGroupId,
      sceneStore.scene.id,
      sceneStore.scene.path,
      newPrivateSessionName,
      newPrivateSessionGroupId,
      newPrivateSessionName,
    );

    try {
      await tableStore.updateSessionPresence(
        tableStore.table.id,
        {
          [newPrivateSessionGroupId]: newPrivateSessionPresence,
        },
      );
    } catch (e) {
      console.error(e);
      console.log(newPrivateSessionPresence);

      const notificationStore = useNotificationStore();
      notificationStore.error(`Failed to create private session: ${newPrivateSessionName}`);
    }
  };

  const launchPrivateSession = (presence: TableSessionPresence) => {
    tableStore.sessionOverride = presence.sessionId;

    const notificationStore = useNotificationStore();
    notificationStore.success(
      `Launched private session: ${presence.groupLabel ?? presence.groupId}`,
    );
  };

  const findSessionsByGroupId = (groupId: string) => {
    return viewerSessions.value.filter(session => session.groupId === groupId);
  };

  const { $logger } = useNuxtApp();
  const log = $logger.session;

  const updateScreenFrame = async (box: { x: number; y: number; width: number; height: number }) => {
    // only update private sessions for now
    if (!tableStore.table || !activeSession.value || !privateSessions.value.some(session => session.sessionId === activeSessionId.value)) {
      return;
    }
    // don't update if the box is empty
    if (box.width <= 0 || box.height <= 0) {
      return;
    }

    const newSessionPresence = structuredClone(toRaw(activeSession.value));
    newSessionPresence.screen = {
      enabled: newSessionPresence.screen?.enabled ?? true,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };

    log(`[Updating position]:\nx: ${box.x}, y: ${box.y}, width: ${box.width}, height: ${box.height}`);

    if (newSessionPresence.screen.enabled) {
      try {
        await tableStore.updateSessionPresence(
          tableStore.table.id,
          {
            [activeSession.value.sessionId]: newSessionPresence,
          },
        );
      } catch (e) {
        console.error(e);
      }
    }
  };

  return {
    ownSession,
    activeSessionId,
    activeSession,
    viewerSessions,
    privateSessions,
    sessionGroups,
    emptyTable,
    createPrivateSession,
    launchPrivateSession,
    findSessionsByGroupId,
    updateScreenFrame,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSessionStore, import.meta.hot),
  );
}
