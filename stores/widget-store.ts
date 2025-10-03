import type { NestedPartial, Widget } from '~/models/types';
import { collection, deleteDoc, doc, getDoc, orderBy, query, setDoc, updateDoc, where } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';

export const useWidgetStore = defineStore('widget', () => {
  const { $db } = useNuxtApp();
  const userStore = useUserStore();
  const tableStore = useTableStore();

  const widgetsRef = computed(() => {
    if (!userStore.user || !tableStore.table) {
      return undefined;
    }

    return collection($db, 'users', userStore.user.uid, 'widgets').withConverter(firestoreDataConverter<Widget>());
  });

  const widgetsQuery = computed(() => {
    if (!widgetsRef.value) {
      return undefined;
    }

    const widgetIds = new Set(
      Object.values(tableStore.table!.widgets).flat(),
    );

    if (!widgetIds.size) {
      return undefined;
    }

    let q = query(
      widgetsRef.value,
      where('id', 'in', Array.from(widgetIds)),
    );

    if (tableStore.mode !== TableModes.OWN) {
      q = query(
        q,
        where('enabled', '==', true),
      );
    }

    q = query(
      q,
      orderBy('rank', 'asc'),
    );

    return q;
  });

  const widgets = useFirestore(widgetsQuery, []);

  const widgetMap = computed(() => {
    if (!widgets.value || !Array.isArray(widgets.value)) {
      return new Map<string, Widget>();
    }

    const map = widgets.value.reduce((acc, widget) => {
      acc.set(widget.id, widget);
      return acc;
    }, new Map<string, Widget>());

    return map;
  });

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

  const updateWidget = async <T extends Widget>(id: string, payload: NestedPartial<T>) => {
    if (!userStore.user) {
      return false;
    }

    const docRef = doc(collection($db, 'users', userStore.user.uid, 'widgets'), id).withConverter(firestoreDataConverter<T>());

    try {
      const data = makeFirestoreUpdateData(payload);
      await updateDoc(docRef, data);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));

      return false;
    }

    return true;
  };

  const removeWidget = async (id: string) => {
    if (!userStore.user) {
      return false;
    }

    const docRef = doc(collection($db, 'users', userStore.user.uid, 'widgets'), id);

    try {
      await deleteDoc(docRef);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));

      return false;
    }

    return true;
  };

  return {
    widgets,
    widgetMap,
    getWidget,
    createWidget,
    updateWidget,
    removeWidget,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWidgetStore, import.meta.hot));
}
