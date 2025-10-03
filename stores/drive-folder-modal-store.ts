import { acceptHMRUpdate, defineStore } from 'pinia';

export const useDriveFolderModalStore = defineStore('drive-folder-modal', () => {
  const parentFolderModalModel = ref(false);

  let resolveHook = (_value: unknown) => {};
  let rejectHook = (_reason: unknown) => {};

  const promptToCreateParentFolder = () => {
    parentFolderModalModel.value = true;

    return new Promise((resolve, reject) => {
      resolveHook = resolve;
      rejectHook = reject;
    });
  };

  return {
    parentFolderModalModel,
    resolve: (value: unknown) => { resolveHook(value); },
    reject: (value: unknown) => { rejectHook(value); },
    promptToCreateParentFolder,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveFolderModalStore, import.meta.hot),
  );
}
