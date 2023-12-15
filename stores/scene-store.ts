import { doc } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type { Scene } from '~/models/types';

export const useSceneStore = defineStore('scene', () => {
  const { $db } = useNuxtApp();

  const tableStore = useTableStore();
  const userStore = useUserStore();

  const sceneDocRef = computed(() => {
    if (!tableStore.table || !userStore.user || !tableStore.sessionId) {
      return undefined;
    }

    const session = tableStore.table.session;
    if (!(tableStore.sessionId in session)) {
      return undefined;
    }

    const sceneId = session[tableStore.sessionId].sceneId;
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
