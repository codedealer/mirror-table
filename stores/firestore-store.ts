import { acceptHMRUpdate, defineStore } from 'pinia';

export const useFirestoreStore = defineStore('firestore', () => {
  const { $db } = useNuxtApp();

  const profile = ref(null);
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useFirestoreStore, import.meta.hot),
  );
}
