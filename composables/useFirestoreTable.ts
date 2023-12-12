import type { WithFieldValue } from '@firebase/firestore';
import { collection, doc, serverTimestamp, writeBatch } from '@firebase/firestore';
import type { Category, DriveFile, Scene, Table, TableCard, TableSession } from '~/models/types';
import { idToSlug } from '~/utils';

export const useFirestoreTable = () => {
  const { $db } = useNuxtApp();

  const create = async (
    title: string,
    thumbnail?: DriveFile,
  ) => {
    const userStore = useUserStore();
    if (!userStore.isAuthenticated || !userStore.user || !userStore.user.email) {
      throw new Error('User is not authenticated');
    }

    const batch = writeBatch($db);

    const tableRef = doc(collection($db, 'tables'));
    const defaultSceneRef = doc(collection($db, 'tables', tableRef.id, 'scenes'));
    const rootCategoryRef = doc(collection($db, 'tables', tableRef.id, 'categories'));

    const session: TableSession = {
      [userStore.user.uid]: defaultSceneRef.id,
    };

    const tableData: WithFieldValue<Table> = {
      id: tableRef.id,
      title,
      rootCategoryId: rootCategoryRef.id,
      owner: userStore.user.uid,
      editors: [userStore.user.uid],
      viewers: [userStore.user.uid],
      session,
      createdAt: serverTimestamp(),
      slug: idToSlug(tableRef.id),
    };

    batch.set(tableRef, tableData);

    const tableCardRef = doc($db, 'users', userStore.user.uid, 'tables', tableRef.id);

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
      thumbnail: thumbnail ?? null,
      type: 'private',
      slug: idToSlug(tableRef.id),
      deleted: false,
    };

    batch.set(tableCardRef, tableCardData);

    const category: WithFieldValue<Category> = {
      id: rootCategoryRef.id,
      tableId: tableRef.id,
      title: 'Default Category',
      parentId: null,
      owner: userStore.user.uid,
      createdAt: serverTimestamp(),
      deletable: false,
      deleted: false,
    };

    batch.set(rootCategoryRef, category);

    const scene: WithFieldValue<Scene> = {
      id: defaultSceneRef.id,
      tableId: tableRef.id,
      categoryId: rootCategoryRef.id,
      title: 'Default Scene',
      owner: userStore.user.uid,
      thumbnail: null,
      createdAt: serverTimestamp(),
      archived: false,
      deletable: false,
      deleted: false,
      slug: idToSlug(defaultSceneRef.id),
    };

    batch.set(defaultSceneRef, scene);

    await batch.commit();
  };

  const remove = (): never => {
    // TODO: move this to api call on the server to delete entire collections of scenes.
    throw new Error('Not implemented');
  };

  return {
    create,
    remove,
  };
};
