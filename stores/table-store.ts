import { acceptHMRUpdate, defineStore } from 'pinia';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, query, where } from '@firebase/firestore';
import type { Table, TableMode, TablePermissions } from '~/models/types';
import { TableModes } from '~/models/types';

export const useTableStore = defineStore('table', () => {
  const { $db } = useNuxtApp();

  const tableSlug = ref('');

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
      return TableModes.OWN;
    } else if (permissions.value.isEditor) {
      return TableModes.EDIT;
    }

    return TableModes.VIEW;
  });

  const { create, remove } = useFirestoreTable();

  return {
    tableSlug,
    table,
    permissions,
    mode,
    create,
    remove,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableStore, import.meta.hot),
  );
}
