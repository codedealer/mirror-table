import type { Scene } from '~/models/types';

export const useSceneSearchStore = defineStore('scene-search', () => {
  const searchModalState = ref(false);
  let searchModalResolveHook = (_: Scene) => {};
  let searchModalRejectHook = (_: unknown) => {};

  const promptToSearch = () => {
    searchModalState.value = true;

    return new Promise((resolve, reject) => {
      searchModalResolveHook = resolve;
      searchModalRejectHook = reject;
    });
  };

  return {
    searchModalState,
    resolve: (value: Scene) => { searchModalResolveHook(value); },
    reject: (value?: unknown) => { searchModalRejectHook(value); },
    promptToSearch,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSceneSearchStore, import.meta.hot));
}
