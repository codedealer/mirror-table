import { collection, doc, orderBy, query, setDoc, where } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type { DriveAsset, Scene, SceneElement, SceneElementCanvasObjectAsset } from '~/models/types';

export const useSceneStore = defineStore('scene', () => {
  const { $db } = useNuxtApp();

  const tableStore = useTableStore();
  const sessionStore = useSessionStore();

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
    if (!tableStore.table || !scene.value) {
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

    q = query(q, orderBy('defaultRank', 'asc'));

    return q;
  });

  const sceneElements = useFirestore(sceneElementsQuery, undefined);

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

    if (!asset.appProperties.preview) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Asset without preview cannot be added to the scene.');
      return;
    }

    const docRef = doc(sceneElementsRef.value);
    const sceneElement: SceneElementCanvasObjectAsset = {
      _type: 'canvas-object',
      id: docRef.id,
      type: 'asset',
      assetId: asset.id,
      label: {
        title: asset.appProperties.title,
        showTitle: asset.appProperties.showTitle,
      },
      container: {
        name: 'element-container',
        x: 0,
        y: 0,
        width: asset.appProperties.preview.nativeWidth,
        height: asset.appProperties.preview.nativeHeight,
        rotation: asset.appProperties.preview.rotation ?? 0,
        scaleX: 1,
        scaleY: 1,
      },
      enabled: false,
      selectionGroup: SelectionGroups.HIDDEN,
      defaultRank: Date.now(),
    };

    try {
      await setDoc(docRef, sceneElement);
    } catch (error) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to add asset to the scene.');
      console.error(error);
    }
  };

  return {
    scene,
    sceneElements,
    addElement,
    addAsset,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSceneStore, import.meta.hot),
  );
}
