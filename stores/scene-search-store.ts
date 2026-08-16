import type { BaseScene } from '~/models/types';

export type SceneVisit = BaseScene & {
  title?: string;
};

export const useSceneSearchStore = defineStore('scene-search', () => {
  const searchModalState = ref(false);
  const recentVisited = ref<SceneVisit[]>([]);
  let searchModalResolveHook = (_scene: BaseScene) => {};
  let searchModalRejectHook = (_error: unknown) => {};

  const promptToSearch = () => {
    searchModalState.value = true;

    return new Promise<BaseScene>((resolve, reject) => {
      searchModalResolveHook = resolve;
      searchModalRejectHook = reject;
    });
  };

  const recentVisitedLimit = 10;
  const recordVisit = (scene: BaseScene) => {
    const index = recentVisited.value.findIndex(item => item.id === scene.id);
    if (index !== -1) {
      recentVisited.value.splice(index, 1);
    }
    recentVisited.value.unshift(scene);
    if (recentVisited.value.length > recentVisitedLimit) {
      recentVisited.value.splice(recentVisitedLimit);
    }
  };

  return {
    searchModalState,
    recentVisited,
    resolve: (value: BaseScene) => { searchModalResolveHook(value); },
    reject: (value?: unknown) => { searchModalRejectHook(value); },
    promptToSearch,
    recordVisit,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSceneSearchStore, import.meta.hot));
}
