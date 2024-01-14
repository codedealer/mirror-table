import { collection, doc, getDoc, setDoc } from '@firebase/firestore';
import type { Widget } from '~/models/types';

export const useWidgetStore = defineStore('widget', () => {
  const _widgets = ref<Widget[]>([]);
  const widgets = computed(() => _widgets.value);

  const { $db } = useNuxtApp();
  const userStore = useUserStore();

  const getWidget = async <T extends Widget>(id: string) => {
    if (!userStore.user) {
      return;
    }

    const docRef = doc(collection($db, 'users', userStore.user.uid, 'widgets'), id).withConverter(firestoreDataConverter<T>());

    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }
  };

  const createWidget = async (widget: Widget) => {
    if (!userStore.user) {
      return;
    }

    const docRef = doc(collection($db, 'users', userStore.user.uid, 'widgets'));

    widget.id = docRef.id;
    widget.owner = userStore.user.uid;

    try {
      await setDoc(docRef, widget);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));

      return;
    }

    return widget;
  };

  return {
    widgets,
    getWidget,
    createWidget,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWidgetStore, import.meta.hot));
}
