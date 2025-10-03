import type { Scene } from '~/models/types';

export const useSceneSearchStore = defineStore('scene-search', () => {
  const searchModalState = ref(false);
  const recentSelected = ref<Scene[]>([]);
  let searchModalResolveHook = (_scene: Scene) => {};
  let searchModalRejectHook = (_error: unknown) => {};

  const promptToSearch = () => {
    searchModalState.value = true;

    return new Promise((resolve, reject) => {
      searchModalResolveHook = resolve;
      searchModalRejectHook = reject;
    });
  };

  const recentSelectedLimit = 10;
  const addRecentSelected = (scene: Scene) => {
    const index = recentSelected.value.findIndex(item => item.id === scene.id);
    if (index !== -1) {
      recentSelected.value.splice(index, 1);
    }
    recentSelected.value.unshift(scene);
    if (recentSelected.value.length > recentSelectedLimit) {
      recentSelected.value.splice(recentSelectedLimit);
    }
  };

  return {
    searchModalState,
    recentSelected,
    resolve: (value: Scene) => { searchModalResolveHook(value); },
    reject: (value?: unknown) => { searchModalRejectHook(value); },
    promptToSearch,
    addRecentSelected,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSceneSearchStore, import.meta.hot));
}
