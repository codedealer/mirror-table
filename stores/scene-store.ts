import { collection, deleteDoc, doc, orderBy, query, setDoc, updateDoc, where, writeBatch } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type {
  DriveAsset,
  NestedPartial,
  Scene,
  SceneElement,
  SceneElementScreen,
} from '~/models/types';
import { SceneElementCanvasObjectAssetFactory } from '~/models/SceneElementCanvasObjectAsset';

export const useSceneStore = defineStore('scene', () => {
  const { $db } = useNuxtApp();

  const tableStore = useTableStore();
  const sessionStore = useSessionStore();
  const driveStore = useDriveStore();

  const sceneDocRef = computed(() => {
    if (!tableStore.table || !sessionStore.activeSession) {
      return undefined;
    }

    const sceneId = sessionStore.activeSession.sceneId;
    const sceneRef = doc($db, 'tables', tableStore.table.id, 'scenes', sceneId)
      .withConverter(firestoreDataConverter<Scene>());

    return sceneRef;
  });

  const scene = useFirestore(sceneDocRef, undefined);

  const sceneElementsRef = computed(() => {
    // we need to wait for drive api to load scene elements
    if (!tableStore.table || !scene.value || !driveStore.isReady) {
      return undefined;
    }

    return collection($db, 'tables', tableStore.table.id, 'scenes', scene.value.id, 'elements').withConverter(firestoreDataConverter<SceneElement>());
  });
  const sceneElementsQuery = computed(() => {
    if (!sceneElementsRef.value || !scene.value) {
      return undefined;
    }

    let q = query(sceneElementsRef.value);

    if (tableStore.mode !== TableModes.OWN) {
      q = query(
        q,
        where('enabled', '==', true),
      );
    }

    q = query(
      q,
      where('owner', '==', scene.value.owner),
      orderBy('selectionGroup', 'asc'),
      orderBy('defaultRank', 'asc'),
    );

    return q;
  });

  const sceneElements = useFirestore(sceneElementsQuery, []);

  const addElement = async (element: SceneElement) => {
    if (!sceneElementsRef.value) {
      return;
    }

    await setDoc(doc(sceneElementsRef.value, element.id), element);
  };

  const addAsset = async (asset: DriveAsset) => {
    if (!sceneElementsRef.value || !scene.value) {
      return;
    }

    const docRef = doc(sceneElementsRef.value);
    const stageStore = useCanvasStageStore();

    try {
      const sceneElement = SceneElementCanvasObjectAssetFactory(
        docRef.id,
        asset,
        scene.value.owner,
        stageStore.fitToStage,
      );

      await setDoc(docRef, sceneElement);
    } catch (error) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to add asset to the scene.');
      console.error(error);
    }
  };

  const addScreen = async (
    fileId: string,
    thumbnail?: string | null,
  ) => {
    if (!sceneElementsRef.value || !scene.value) {
      return;
    }

    const docRef = doc(sceneElementsRef.value);
    const screenElement: SceneElementScreen = {
      id: docRef.id,
      _type: 'screen',
      enabled: false,
      file: fileId,
      thumbnail: thumbnail ?? null,
      selectionGroup: SelectionGroups.SCREEN,
      defaultRank: Date.now(),
      owner: scene.value.owner,
    };

    try {
      await setDoc(docRef, screenElement);
    } catch (error) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to add screen to the scene.');
      console.error(error);
    }
  };

  const updateElement = async <T extends SceneElement>(
    id: string,
    update: NestedPartial<T>,
  ) => {
    if (!sceneElementsRef.value) {
      return;
    }

    const data = makeFirestoreUpdateData(update);
    const docRef = doc(sceneElementsRef.value, id).withConverter(firestoreDataConverter<T>());
    try {
      await updateDoc(docRef, data);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to update scene element.');
      console.error(e);
    }
  };

  const updateElements = async <T extends SceneElement>(
    ids: string[],
    update: NestedPartial<T>,
  ) => {
    if (!sceneElementsRef.value) {
      return;
    }

    const data = makeFirestoreUpdateData(update);
    const batch = writeBatch($db);

    ids.forEach((id) => {
      const docRef = doc(sceneElementsRef.value!, id).withConverter(firestoreDataConverter<T>());
      batch.update(docRef, data);
    });

    try {
      await batch.commit();
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to update scene elements.');
      console.error(e);
    }
  };

  const removeElement = async (element: SceneElement) => {
    if (!sceneElementsRef.value) {
      return;
    }

    try {
      await deleteDoc(doc(sceneElementsRef.value, element.id));
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to remove scene element.');
      console.error(e);
    }
  };

  const removeElements = async (elements: SceneElement[]) => {
    if (!sceneElementsRef.value) {
      return;
    }

    const batch = writeBatch($db);

    elements.forEach((element) => {
      batch.delete(doc(sceneElementsRef.value!, element.id));
    });

    try {
      await batch.commit();
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to remove scene elements.');
      console.error(e);
    }
  };

  return {
    scene,
    sceneElements,
    addElement,
    addAsset,
    addScreen,
    updateElement,
    updateElements,
    removeElement,
    removeElements,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSceneStore, import.meta.hot),
  );
}
