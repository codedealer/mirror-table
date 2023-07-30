import { acceptHMRUpdate, defineStore, skipHydrate } from 'pinia';

export const useDriveStore = defineStore('drive', () => {
  const { isLoading, isReady, client } = useDrive();

  return {
    isLoading: skipHydrate(isLoading),
    isReady: skipHydrate(isReady),
    client: skipHydrate(client),
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useDriveStore, import.meta.hot),
  );
}
