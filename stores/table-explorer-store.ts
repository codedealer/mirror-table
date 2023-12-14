import type {
  CollectionReference, DocumentData,
  Query,
  WithFieldValue,
} from '@firebase/firestore';
import {
  collection,
  doc, getDoc,
  getDocs,
  limit,
  orderBy,
  query, serverTimestamp, setDoc,
  updateDoc,
  where,
} from '@firebase/firestore';
import type { Category, Scene, TreeNode } from '~/models/types';

export const useTableExplorerStore = defineStore('table-explorer', () => {
  const tableStore = useTableStore();
  const { $db } = useNuxtApp();

  const isReady = computed(() => {
    return !!tableStore.table;
  });

  const categoriesRef = computed(() => {
    if (!tableStore.table) {
      return;
    }

    return collection($db, 'tables', tableStore.table.id, 'categories')
      .withConverter(firestoreDataConverter<Category>());
  });

  const scenesRef = computed(() => {
    if (!tableStore.table) {
      return;
    }

    return collection($db, 'tables', tableStore.table.id, 'scenes')
      .withConverter(firestoreDataConverter<Scene>());
  });

  const categories = ref<Record<string, Category>>({});
  const scenes = ref<Record<string, Scene>>({});

  const rootNode = ref<TreeNode | undefined>();

  const nodes = computed(() => {
    return rootNode.value?.children ?? [];
  });

  const setNodeLoading = (node: TreeNode, loading: boolean) => {
    node.loading = loading;
    if (node.children) {
      node.children.forEach(child => setNodeLoading(child, loading));
    }
  };

  const tryExecuteQuery = async <T extends Scene | Category>(query: Query<T>) => {
    try {
      const snapshot = await getDocs(query);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error(error);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(error));
      return null;
    }
  };

  const loadChildren = async (node: TreeNode) => {
    setNodeLoading(node, true);

    const categoriesQuery = query(
      categoriesRef.value!,
      where('parentId', '==', node.id),
      where('deleted', '==', false),
      orderBy('createdAt', 'asc'),
      limit(50),
    );
    const scenesQuery = query(
      scenesRef.value!,
      where('categoryId', '==', node.id),
      where('deleted', '==', false),
      orderBy('createdAt', 'asc'),
      limit(50),
    );

    const childCategories = await tryExecuteQuery<Category>(categoriesQuery);
    const childScenes = await tryExecuteQuery<Scene>(scenesQuery);

    if (childCategories === null || childScenes === null) {
      setNodeLoading(node, false);
      return false;
    }

    // save to cache
    childCategories.forEach((category) => {
      categories.value[category.id] = category;
    });
    childScenes.forEach((scene) => {
      scenes.value[scene.id] = scene;
    });

    const newNodes = [
      ...childCategories.map(category => ExplorerTreeNodeFactory(category)),
      ...childScenes.map(scene => ExplorerTreeNodeFactory(scene)),
    ];

    node.children = newNodes;
    node.loaded = true;

    setNodeLoading(node, false);

    return true;
  };

  watchEffect(() => {
    if (!tableStore.table || !tableStore.permissions.isOwner) {
      return;
    }

    rootNode.value = {
      $folded: false,
      id: tableStore.table.rootCategoryId,
      label: tableStore.table.title,
      isFolder: true,
      loaded: false,
      loading: false,
      disabled: false,
    };
  });

  let rootLoadTries = 0;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watchEffect(async () => {
    if (
      !rootNode.value ||
      rootNode.value.loading ||
      rootNode.value.loaded ||
      rootLoadTries > 0
    ) {
      return;
    }

    rootLoadTries++;
    await loadChildren(rootNode.value);
  });

  const toggleCategory = async (node: TreeNode) => {
    if (!node.isFolder) {
      return;
    }

    if (node.loaded) {
      node.$folded = !node.$folded;
      return;
    }

    if (await loadChildren(node)) {
      node.$folded = false;
    }
  };

  const loadItem = async <T extends DocumentData>
  (
    id: string,
    dbRef: CollectionReference<T, WithFieldValue<T>>,
  ) => {
    const itemRef = doc(dbRef, id).withConverter(firestoreDataConverter<T>());

    const snapshot = await getDoc(itemRef);
    return snapshot.data();
  };

  const loadCategory = (id: string) => {
    if (!categoriesRef.value) {
      throw new Error('Loading category when firestore is not ready');
    }
    return loadItem<Category>(id, categoriesRef.value);
  };

  const saveCategory = async (title: string, parent: TreeNode, id?: string) => {
    if (!tableStore.table || !parent.children) {
      return;
    }

    const categoryRef = id
      ? doc($db, 'tables', tableStore.table.id, 'categories', id)
      : doc(collection($db, 'tables', tableStore.table.id, 'categories'));

    const category: WithFieldValue<Category> = {
      id: categoryRef.id,
      tableId: tableStore.table.id,
      title,
      parentId: parent.id,
      owner: tableStore.table.owner,
      createdAt: serverTimestamp(),
      deletable: true,
      deleted: false,
    };

    try {
      if (!id) {
        await setDoc(categoryRef, category);
      } else {
        await updateDoc(categoryRef, {
          title,
          parentId: parent.id,
        });
      }
    } catch (error) {
      console.error(error);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(error));
    }

    // update the cache
    let newCategory: Category | undefined;
    try {
      newCategory = await loadCategory(categoryRef.id);

      if (!newCategory) {
        throw new Error('Category not found after saving');
      }

      categories.value[newCategory.id] = newCategory;
    } catch (error) {
      console.error(error);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(error));
      return;
    }

    // update the tree
    const node = ExplorerTreeNodeFactory(newCategory);

    const index = parent.children.findIndex(child => !child.isFolder);
    if (index === -1) {
      parent.children.push(node);
    } else {
      parent.children.splice(index, 0, node);
    }

    if (parent.$folded) {
      await toggleCategory(parent);
    }
  };

  const loadScene = (id: string) => {
    if (!scenesRef.value) {
      throw new Error('Loading scene when firestore is not ready');
    }

    return loadItem<Scene>(id, scenesRef.value);
  };

  const saveScene = async (title: string, parent: TreeNode, id?: string) => {
    if (!tableStore.table || !parent.children) {
      return;
    }

    const sceneRef = id
      ? doc($db, 'tables', tableStore.table.id, 'scenes', id)
      : doc(collection($db, 'tables', tableStore.table.id, 'scenes'));

    const scene: WithFieldValue<Scene> = {
      id: sceneRef.id,
      tableId: tableStore.table.id,
      categoryId: parent.id,
      title,
      owner: tableStore.table.owner,
      thumbnail: null,
      createdAt: serverTimestamp(),
      archived: false,
      deletable: true,
      deleted: false,
      slug: '',
    };

    try {
      if (!id) {
        await setDoc(sceneRef, scene);
      } else {
        await updateDoc(sceneRef, {
          title,
          categoryId: parent.id,
        });
      }
    } catch (error) {
      console.error(error);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(error));
    }

    // update the cache
    let newScene: Scene | undefined;
    try {
      newScene = await loadScene(sceneRef.id);

      if (!newScene) {
        throw new Error('Scene not found after saving');
      }

      scenes.value[newScene.id] = newScene;
    } catch (error) {
      console.error(error);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(error));
      return;
    }

    // update the tree
    const node = ExplorerTreeNodeFactory(newScene);

    parent.children.push(node);

    if (parent.$folded) {
      await toggleCategory(parent);
    }
  };

  return {
    isReady,
    categories,
    scenes,
    rootNode,
    nodes,
    loadChildren,
    toggleCategory,
    loadCategory,
    saveCategory,
    loadScene,
    saveScene,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useTableExplorerStore, import.meta.hot),
  );
}
