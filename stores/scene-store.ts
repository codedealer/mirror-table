import { doc } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type { Scene } from '~/models/types';

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

  return {
    scene,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSceneStore, import.meta.hot),
  );
}
