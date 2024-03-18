import { acceptHMRUpdate, defineStore } from 'pinia';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type { WithFieldValue } from '@firebase/firestore';
import { collection, deleteField, query, where } from '@firebase/firestore';
import type {
  BaseScene,
  DynamicPanelModelType,
  Table,
  TableMode,
  TablePermissions,
  TableSession,
} from '~/models/types';
import { TableModes } from '~/models/types';

export const useTableStore = defineStore('table', () => {
  const { $db } = useNuxtApp();

  const tableSlug = ref('');
  const sessionOverride = ref<string | null>(null);

  const userStore = useUserStore();

  const q = computed(() => {
    if (!tableSlug.value || !userStore.isAuthenticated || !userStore.user) {
      return false;
    }

    return query(
      collection($db, 'tables')
        .withConverter(firestoreDataConverter<Table>()),
      where('slug', '==', tableSlug.value),
      where('viewers', 'array-contains', userStore.user.uid),
    );
  });

  const tables = useFirestore(q, undefined);

  const table = computed(() => {
    if (!tables.value || !Array.isArray(tables.value)) {
      return undefined;
    }

    if (tables.value.length === 0) {
      return null;
    }

    return tables.value[0];
  });

  const permissions = computed<TablePermissions>(() => {
    const obj = {
      isOwner: false,
      isEditor: false,
      isViewer: false,
    };

    if (!userStore.user || !table.value) {
      return obj;
    }

    return {
      isOwner: table.value.owner === userStore.user.uid,
      isEditor: table.value.editors.includes(userStore.user.uid),
      isViewer: table.value.viewers.includes(userStore.user.uid),
    };
  });

  const mode = computed<TableMode | undefined>(() => {
    if (!userStore.user || table.value === undefined) {
      return undefined;
    }

    if (table.value === null) {
      return TableModes.INVALID;
    }

    if (permissions.value.isOwner) {
      return sessionOverride.value ? TableModes.PRESENTATION : TableModes.OWN;
    } else if (permissions.value.isEditor) {
      return TableModes.EDIT;
    }

    return TableModes.VIEW;
  });

  const sessionId = computed(() => {
    if (!userStore.user?.uid) {
      return undefined;
    }

    return userStore.user.uid;
  });

  const {
    create,
    updateSessionPresence,
    update,
    remove,
  } = useFirestoreTable();

  const setActiveScene = async (
    sessionIds: string[] | string,
    scene: BaseScene,
  ) => {
    if (!table.value || !scene) {
      return;
    }

    const sIds = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
    const session: TableSession = {};

    sIds.forEach((id) => {
      if (!(id in table.value!.session)) {
        throw new Error(`Session ${id} does not exist`);
      }

      const presence = structuredClone(toRaw(table.value!.session[id]));
      presence.sceneId = scene.id;
      presence.path = scene.path;

      session[id] = presence;
    });

    try {
      await updateSessionPresence(table.value.id, session);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(`Failed to set active scene: ${scene.id}`);
    }
  };

  const moveGroupToScene = async (
    groupId: string,
    scene: BaseScene,
  ) => {
    const sessionStore = useSessionStore();
    const sessionIds = sessionStore
      .findSessionsByGroupId(groupId)
      .map(s => s.sessionId);

    await setActiveScene(sessionIds, scene);
  };

  const moveAllViewersToScene = async (
    scene: BaseScene,
  ) => {
    const sessionStore = useSessionStore();
    const sessionIds = sessionStore
      .viewerSessions.map(s => s.sessionId);

    await setActiveScene(sessionIds, scene);
  };

  const removeViewer = async (sessionId: string) => {
    if (!table.value) {
      return;
    }

    const session: WithFieldValue<TableSession> = {};
    session[sessionId] = deleteField();

    await updateSessionPresence(table.value.id, session);
  };

  const togglePanelsState = async (panels: Partial<Record<DynamicPanelModelType, boolean>>) => {
    if (!table.value) {
      return;
    }

    try {
      await update(table.value.id, { panels });
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to update panels state.');
    }
  };

  const addWidgetToPanel = async (panel: DynamicPanelModelType, widgetId: string) => {
    if (!table.value) {
      return;
    }

    const ids = [...table.value.widgets[panel], widgetId];
    const uniqueIds = [...new Set(ids)];

    const notificationStore = useNotificationStore();
    try {
      await update(table.value.id, { widgets: { [panel]: uniqueIds } });

      notificationStore.success(`Widget added to ${panel} panel.`);
    } catch (e) {
      console.error(e);
      notificationStore.error('Failed to add widget to panel.');
    }
  };

  const removeWidgetFromPanel = async (panel: DynamicPanelModelType, widgetId: string) => {
    if (!table.value) {
      return;
    }

    const ids = table.value.widgets[panel].filter(id => id !== widgetId);

    const notificationStore = useNotificationStore();
    try {
      await update(table.value.id, { widgets: { [panel]: ids } });

      notificationStore.success(`Widget removed from ${panel} panel.`);
    } catch (e) {
      console.error(e);
      notificationStore.error('Failed to remove widget from panel.');
    }
  };

  return {
    tableSlug,
    table,
    permissions,
    mode,
    sessionId,
    sessionOverride,
    create,
    updateSessionPresence,
    setActiveScene,
    moveGroupToScene,
    moveAllViewersToScene,
    removeViewer,
    togglePanelsState,
    addWidgetToPanel,
    removeWidgetFromPanel,
    remove,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableStore, import.meta.hot),
  );
}
