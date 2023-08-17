import { acceptHMRUpdate, defineStore } from 'pinia';
import type { WithFieldValue } from '@firebase/firestore';
import type { DriveFile, Scene, Table, TableCard, TableScenesSortMap } from '~/models/types';
import { idToSlug } from '~/utils';

export const useTableStore = defineStore('table', () => {
  const { $db, $ops } = useNuxtApp();

  const create = async (
    title: string,
    thumbnail: DriveFile | null,
  ) => {
    const userStore = useUserStore();
    if (!userStore.isAuthenticated || !userStore.user || !userStore.user.email) {
      throw new Error('User is not authenticated');
    }

    const { doc, serverTimestamp, collection, writeBatch } = $ops;

    const batch = writeBatch($db);

    const tableRef = doc(collection($db, 'tables'))
      .withConverter(firestoreDataConverter<Table>());
    const defaultSceneRef = doc(collection($db, 'tables', tableRef.id, 'scenes'));

    const tableData: WithFieldValue<Table> = {
      id: tableRef.id,
      title,
      pointer: defaultSceneRef.id,
      createdAt: serverTimestamp(),
      owner: userStore.user.uid,
      viewers: [userStore.user.uid],
      editors: [userStore.user.uid],
      slug: idToSlug(tableRef.id),
    };

    batch.set(tableRef, tableData);

    const tableCardRef = doc($db, 'users', userStore.user.uid, 'tables', tableRef.id)
      .withConverter(firestoreDataConverter<TableCard>());

    const tableCardData: WithFieldValue<TableCard> = {
      id: tableRef.id,
      title,
      createdAt: serverTimestamp(),
      lastAccess: serverTimestamp(),
      owner: {
        displayName: userStore.user.displayName ?? 'unknown name',
        photoURL: userStore.user.photoURL ?? '',
        email: userStore.user.email,
      },
      role: 'owner',
      thumbnail,
      type: 'private',
      slug: idToSlug(tableRef.id),
    };

    batch.set(tableCardRef, tableCardData);

    const scene: WithFieldValue<Scene> = {
      id: defaultSceneRef.id,
      tableId: tableRef.id,
      title: 'Default Scene',
      thumbnail: null,
      createdAt: serverTimestamp(),
      archived: false,
      slug: idToSlug(defaultSceneRef.id),
    };

    batch.set(defaultSceneRef, scene);

    const sortMapRef = doc(
      $db,
      'users',
      userStore.user.uid,
      'sortMaps',
      tableRef.id,
    );

    const sortMapData: WithFieldValue<TableScenesSortMap> = {
      tableId: tableRef.id,
      map: { [defaultSceneRef.id]: 0 },
    };

    batch.set(sortMapRef, sortMapData);

    await batch.commit();
  };

  const remove = async (tableId: string) => {
    // TODO: move this to api call on the server to delete entire collections of scenes.
    const userStore = useUserStore();
    if (!userStore.isAuthenticated || !userStore.user || !userStore.user.email) {
      throw new Error('User is not authenticated');
    }

    const { doc, collection, writeBatch } = $ops;

    const batch = writeBatch($db);

    const tableRef = doc(collection($db, 'tables'), tableId);

    batch.delete(tableRef);

    const tableCardRef = doc($db, 'users', userStore.user.uid, 'tables', tableId);

    batch.delete(tableCardRef);

    await batch.commit();
  };

  return {
    create,
    remove,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableStore, import.meta.hot),
  );
}
