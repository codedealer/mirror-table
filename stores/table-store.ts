import { acceptHMRUpdate, defineStore } from 'pinia';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, query, where } from '@firebase/firestore';
import type { Table, TableMode, TablePermissions, TableSession } from '~/models/types';
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
    remove,
  } = useFirestoreTable();

  const setActiveScene = async (
    sessionIds: string[] | string,
    sceneId: string,
    path: string[],
  ) => {
    if (!table.value || !sceneId) {
      return;
    }

    const sIds = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
    const session: TableSession = {};

    sIds.forEach((id) => {
      if (!(id in table.value!.session)) {
        throw new Error(`Session ${id} does not exist`);
      }

      const presence = structuredClone(toRaw(table.value!.session[id]));
      presence.sceneId = sceneId;
      presence.path = path;

      session[id] = presence;
    });

    try {
      await updateSessionPresence(table.value.id, session);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(`Failed to set active scene: ${sceneId}`);
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
    remove,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableStore, import.meta.hot),
  );
}
