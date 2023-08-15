import { acceptHMRUpdate, defineStore } from 'pinia';
import { useFirestore } from '@vueuse/firebase';
import type { DocumentData, QueryDocumentSnapshot, SnapshotOptions, WithFieldValue } from '@firebase/firestore';
import type { Table } from '~/models/types';
import { idToSlug } from '~/utils';

export const useTableStore = defineStore('table', () => {
  const { $db, $ops } = useNuxtApp();

  let tables = ref<Table[] | undefined>(undefined);

  const firestoreDataConverter = <T>() => ({
    toFirestore: (data: WithFieldValue<T>) => data,
    fromFirestore: (
      snap: QueryDocumentSnapshot<DocumentData, DocumentData>,
      options?: SnapshotOptions,
    ) => snap.data(options) as T,
  });

  const create = async (
    table: Required<Pick<Table, 'title' | 'thumbnail'>> & Partial<Table>,
  ) => {
    const userStore = useUserStore();
    if (!userStore.isAuthenticated) {
      throw new Error('User is not authenticated');
    }

    const { doc, setDoc, serverTimestamp, collection } = $ops;
    const docRef = doc(collection($db, 'tables')).withConverter(firestoreDataConverter<Table>());
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

  if ($ops) {
    const userStore = useUserStore();
    const { collection, query, where, orderBy, onSnapshot } = $ops;
    const q = computed(() => {
      if (!userStore.isAuthenticated) {
        return false;
      }
      return query(
        collection($db, 'tables').withConverter(firestoreDataConverter<Table>()),
        where('permissions', 'array-contains', userStore.user!.uid),
        orderBy('lastAccess', 'desc'),
      );
    });

    tables = useFirestore(q, undefined);
  }

  return {
    tables,
    create,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableStore, import.meta.hot),
  );
}
