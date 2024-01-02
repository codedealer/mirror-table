import { collection, deleteDoc, doc, orderBy, query, setDoc, updateDoc, where } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type { DriveAsset, NestedPartial, Scene, SceneElement, SceneElementScreen } from '~/models/types';
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
    if (!sceneElementsRef.value) {
      return undefined;
    }

    let q = query(sceneElementsRef.value);

    if (!tableStore.permissions.isOwner) {
      q = query(
        q,
        where('enabled', '==', true),
      );
    }

    q = query(
      q,
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
    if (!sceneElementsRef.value) {
      return;
    }

    const docRef = doc(sceneElementsRef.value);
    const stageStore = useCanvasStageStore();

    try {
      const sceneElement = SceneElementCanvasObjectAssetFactory(
        docRef.id,
        asset,
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
    if (!sceneElementsRef.value) {
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

  const removeElement = async (element: SceneElement) => {
    if (!sceneElementsRef.value) {
      return;
    }

    await deleteDoc(doc(sceneElementsRef.value, element.id));
  };

  return {
    scene,
    sceneElements,
    addElement,
    addAsset,
    addScreen,
    updateElement,
    removeElement,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSceneStore, import.meta.hot),
  );
}
