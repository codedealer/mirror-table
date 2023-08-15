import { acceptHMRUpdate, defineStore } from 'pinia';
import type { Table } from '~/models/types';
import { idToSlug } from '~/utils';

export const useTableStore = defineStore('table', () => {
  const { $db, $ops } = useNuxtApp();

  const create = async (
    table: Required<Pick<Table, 'title' | 'thumbnail'>> & Partial<Table>,
  ) => {
    const userStore = useUserStore();
    if (!userStore.isAuthenticated) {
      throw new Error('User is not authenticated');
    }

    const { doc, setDoc, serverTimestamp, collection } = $ops;
    const docRef = doc(collection($db, 'tables'))
      .withConverter(firestoreDataConverter<Table>());

    const data = {
      ...table,
      id: docRef.id,
      createdAt: serverTimestamp(),
      lastAccess: serverTimestamp(),
      owner: userStore.user!.uid,
      permissions: [userStore.user!.uid],
      slug: idToSlug(docRef.id),
    };

    await setDoc(docRef, data);
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
