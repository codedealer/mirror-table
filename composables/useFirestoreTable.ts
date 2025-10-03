import type { UpdateData, WithFieldValue } from '@firebase/firestore';
import type {
  Category,
  DriveFile,
  NestedPartial,
  Scene,
  Table,
  TableCard,
  TableSession,
} from '~/models/types';
import { collection, doc, serverTimestamp, updateDoc, writeBatch } from '@firebase/firestore';
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

    const scenePath = [rootCategoryRef.id];
    const ownerPresence = TableSessionPresenceFactory(
      userStore.user.uid,
      defaultSceneRef.id,
      scenePath,
    );
    const session: TableSession = {
      [userStore.user.uid]: ownerPresence,
    };

    const tableData: WithFieldValue<Table> = {
      id: tableRef.id,
      title,
      rootCategoryId: rootCategoryRef.id,
      owner: userStore.user.uid,
      editors: [userStore.user.uid],
      viewers: [userStore.user.uid],
      session,
      panels: {
        [DynamicPanelModelTypes.LEFT]: false,
        [DynamicPanelModelTypes.RIGHT]: false,
      },
      widgets: {
        [DynamicPanelModelTypes.LEFT]: [],
        [DynamicPanelModelTypes.RIGHT]: [],
      },
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
      path: scenePath,
      title: 'Default Scene',
      owner: userStore.user.uid,
      thumbnail: null,
      createdAt: serverTimestamp(),
      archived: false,
      deletable: false,
      deleted: false,
      slug: idToSlug(defaultSceneRef.id),
      settings: {},
    };

    batch.set(defaultSceneRef, scene);

    await batch.commit();
  };

  const updateSessionPresence = async (
    tableId: string,
    partialSession: WithFieldValue<TableSession>,
  ) => {
    const tableRef = doc($db, 'tables', tableId);

    // create update object: prepend each key in partialSession with 'session.'
    const update: UpdateData<Table> = {};
    Object.entries(partialSession).forEach(([key, value]) => {
      update[`session.${key}`] = value;
    });

    await updateDoc(tableRef, update);
  };

  const update = async (
    tableId: string,
    payload: NestedPartial<Table>,
  ) => {
    const tableRef = doc($db, 'tables', tableId);

    const updateData = makeFirestoreUpdateData(payload);
    await updateDoc(tableRef, updateData);
  };

  const remove = (): never => {
    // TODO: move this to api call on the server to delete entire collections of scenes.
    throw new Error('Not implemented');
  };

  return {
    create,
    updateSessionPresence,
    update,
    remove,
  };
};
