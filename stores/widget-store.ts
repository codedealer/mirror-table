import type { NestedPartial, Widget, WidgetNimbleGroup, WidgetNimbleGroupActor } from '~/models/types';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, deleteDoc, doc, getDoc, orderBy, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { normalizeNimbleActorRanks, normalizeNimbleConditions } from '~/models/NimbleGroup';
import { TableModes } from '~/models/types';

export const useWidgetStore = defineStore('widget', () => {
  const { $db } = useNuxtApp();
  const userStore = useUserStore();
  const tableStore = useTableStore();
  const canEdit = computed(() => tableStore.mode === TableModes.OWN);

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
      return null;
    }

    const docRef = doc(
      collection($db, 'users', userStore.user.uid, 'widgets'),
      id,
    ).withConverter(firestoreDataConverter<T>());

    try {
      const docSnap = await getDoc(docRef);

      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
      throw e;
    }
  };

  const saveWidgetDoc = async <T extends Widget>(id: string, widget: T) => {
    if (!userStore.user) {
      return;
    }

    const docRef = doc(
      collection($db, 'users', userStore.user.uid, 'widgets'),
      id,
    ).withConverter(firestoreDataConverter<T>());

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

  const createWidget = async (widget: Widget) => {
    if (!userStore.user) {
      return;
    }

    const docRef = doc(collection($db, 'users', userStore.user.uid, 'widgets'));

    widget.id = docRef.id;
    widget.owner = userStore.user.uid;

    return await saveWidgetDoc(widget.id, widget);
  };

  const createWidgetWithId = async <T extends Widget>(id: string, widget: T) => {
    if (!userStore.user) {
      return;
    }

    if (!id) {
      throw new Error('Widget id is empty');
    }

    widget.id = id;
    widget.owner = userStore.user.uid;

    return await saveWidgetDoc(id, widget);
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

  const updateNimbleActors = async (id: string, change: (actors: WidgetNimbleGroupActor[]) => WidgetNimbleGroupActor[]) => {
    if (!userStore.user || !canEdit.value) {
      return false;
    }

    const docRef = doc(collection($db, 'users', userStore.user.uid, 'widgets'), id);
    try {
      await runTransaction($db, async (transaction) => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists()) {
          throw new Error('Nimble widget not found');
        }

        const widget = snapshot.data() as WidgetNimbleGroup;
        transaction.update(docRef, { actors: normalizeNimbleActorRanks(change(widget.actors)) });
      });
      return true;
    } catch (e) {
      console.error(e);
      useNotificationStore().error(extractErrorMessage(e));
      return false;
    }
  };

  const addNimbleActor = (id: string, actor: WidgetNimbleGroupActor) => updateNimbleActors(id, actors => [...actors, actor]);
  const updateNimbleActor = (id: string, actorId: string, payload: Partial<WidgetNimbleGroupActor>) => updateNimbleActors(id, actors => actors.map(actor => actor.id === actorId ? { ...actor, ...payload } as WidgetNimbleGroupActor : actor));
  const removeNimbleActor = (id: string, actorId: string) => updateNimbleActors(id, actors => actors.filter(actor => actor.id !== actorId));
  const reorderNimbleActors = (id: string, actorIds: string[]) => updateNimbleActors(id, (actors) => {
    const actorsById = new Map(actors.map(actor => [actor.id, actor]));
    const reordered = actorIds.flatMap((actorId) => {
      const actor = actorsById.get(actorId);
      actorsById.delete(actorId);
      return actor ? [actor] : [];
    });
    return [...reordered, ...actorsById.values()];
  });
  const toggleNimbleActor = (id: string, actorId: string) => updateNimbleActors(id, actors => actors.map(actor => actor.id === actorId ? { ...actor, enabled: !actor.enabled } : actor));
  const addNimbleCondition = (id: string, actorId: string, condition: string) => updateNimbleActors(id, actors => actors.map((actor) => {
    if (actor.id !== actorId) {
      return actor;
    }
    const normalized = normalizeNimbleConditions([condition])[0];
    if (!normalized) {
      return actor;
    }
    return { ...actor, conditions: normalizeNimbleConditions([normalized, ...actor.conditions]) };
  }));
  const removeNimbleCondition = (id: string, actorId: string, condition: string) => updateNimbleActors(id, actors => actors.map((actor) => {
    if (actor.id !== actorId) {
      return actor;
    }
    const normalized = condition.trim();
    return { ...actor, conditions: actor.conditions.filter(item => item !== normalized) };
  }));

  return {
    widgets,
    widgetMap,
    getWidget,
    createWidget,
    createWidgetWithId,
    updateWidget,
    removeWidget,
    addNimbleActor,
    updateNimbleActor,
    removeNimbleActor,
    reorderNimbleActors,
    toggleNimbleActor,
    addNimbleCondition,
    removeNimbleCondition,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWidgetStore, import.meta.hot));
}
