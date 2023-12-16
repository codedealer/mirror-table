import { LOCAL_GROUP_ID_PREFIX, LOCAL_NAME_PREFIX } from '~/models/TableSessionPresence';
import type { SessionGroup } from '~/models/types';

export const useSessionStore = defineStore('session', () => {
  const tableStore = useTableStore();

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

  return {
    ownSession,
    viewerSessions,
    privateSessions,
    sessionGroups,
    emptyTable,
    createPrivateSession,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSessionStore, import.meta.hot),
  );
}
