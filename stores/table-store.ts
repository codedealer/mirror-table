import { acceptHMRUpdate, defineStore } from 'pinia';
import type { WithFieldValue } from '@firebase/firestore';
import type { DriveFile, Table, TableCard } from '~/models/types';
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

    const tableData: WithFieldValue<Table> = {
      id: tableRef.id,
      title,
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
      slug: idToSlug(tableRef.id),
    };

    batch.set(tableCardRef, tableCardData);

    await batch.commit();
  };

  return {
    create,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableStore, import.meta.hot),
  );
}
