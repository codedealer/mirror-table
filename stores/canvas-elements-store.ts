import type { ComputedRef } from 'vue';
import { collection, deleteDoc, doc, query, setDoc, where } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import {
  TableModes,
  isSceneElementCanvasObject,
  isSceneElementCanvasObjectAsset,
} from '~/models/types';
import type {
  CanvasElementState, CanvasElementStateAsset,
  ElementContainerConfig,
  SceneElementCanvasObject,
  SceneElementCanvasObjectAssetProperties,
  SceneElementScreen,
} from '~/models/types';

export const useCanvasElementsStore = defineStore('canvas-elements', () => {
  const sceneStore = useSceneStore();
  const userStore = useUserStore();
  const { $db } = useNuxtApp();

  const assetPropertiesRef = computed(() => {
    if (!userStore.user) {
      return undefined;
    }

    return collection($db, 'users', userStore.user.uid, 'asset_properties').withConverter(firestoreDataConverter<SceneElementCanvasObjectAssetProperties>());
  });

  const screenElements: ComputedRef<SceneElementScreen[]> = computed(() => {
    if (!sceneStore.sceneElements) {
      return [];
    }

    return sceneStore.sceneElements.filter(isSceneElementScreen);
  });

  const canvasElements: ComputedRef<SceneElementCanvasObject[]> = computed(() => {
    if (!sceneStore.sceneElements) {
      return [];
    }

    return sceneStore.sceneElements.filter(isSceneElementCanvasObject);
  });

  const canvasElementsStateRegistry = ref<Record<string, CanvasElementState>>({});

  const selectedElements = computed(() => {
    return canvasElements.value.filter((element) => {
      return element.id in canvasElementsStateRegistry.value &&
        canvasElementsStateRegistry.value[element.id].selected &&
        canvasElementsStateRegistry.value[element.id].selectable;
    });
  });

  const complexAssetIds = computed(() => {
    return canvasElements.value
      .filter(isSceneElementCanvasObjectAsset)
      .filter(asset => asset.asset.kind === AssetPropertiesKinds.COMPLEX && asset.asset.id)
      .map(asset => asset.asset.id);
  });

  const assetPropertiesQuery = computed(() => {
    if (!assetPropertiesRef.value || complexAssetIds.value.length === 0) {
      return undefined;
    }

    /*
     Limited to 30 IDs (Firestore limitation)
     this should be acceptable for now since there aren't that many complex assets in a scene and making individual listeners incur additional rule evaluation costs and js overhead. In case the properties aren't fetched for the asset, it falls back to the saved on creation copy of the properties.
    */
    if (complexAssetIds.value.length > 30) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Too many complex assets in the scene. Performance may degrade.');
      console.warn('Too many complex assets in the scene. Performance may degrade.');
    }
    return query(
      assetPropertiesRef.value,
      where('id', 'in', complexAssetIds.value.slice(0, 30)),
    );
  });

  const assetPropertiesArray = useFirestore(assetPropertiesQuery, []);

  const assetPropertiesRegistry = computed<Record<string, SceneElementCanvasObjectAssetProperties>>(() => {
    return assetPropertiesArray.value.reduce((acc, property) => {
      if (property && property.id) {
        acc[property.id] = property;
      }
      return acc;
    }, {} as Record<string, SceneElementCanvasObjectAssetProperties>);
  });

  const complexAssetsReady = computed(() => {
    // Only check the first 30 IDs that would be in the query
    const queryableIds = complexAssetIds.value.slice(0, 30);

    return queryableIds.length === 0 ||
           queryableIds.every(id =>
             assetPropertiesRegistry.value[id]?.preview?.id !== undefined,
           );
  });

  const layersStore = useLayersStore();
  const tableStore = useTableStore();

  const { activeGroups } = storeToRefs(layersStore);
  const { mode } = storeToRefs(tableStore);

  const addComplexAssetProperties = async (properties: SceneElementCanvasObjectAssetProperties) => {
    if (!assetPropertiesRef.value) {
      return;
    }

    await setDoc(doc(assetPropertiesRef.value, properties.id), properties);
  };

  const removeComplexAssetProperties = async (id: string) => {
    if (!assetPropertiesRef.value || !id) {
      return;
    }

    await deleteDoc(doc(assetPropertiesRef.value, id));
  };

  const createAssetState = (elementId: string) => {
    const element = canvasElements.value.find(element => element.id === elementId);
    if (!element) {
      console.warn(`Trying to create a state for a non-existent asset: ${elementId}`);
      return;
    }

    canvasElementsStateRegistry.value[elementId] = {
      _type: 'asset',
      id: elementId,
      loading: false,
      loaded: false,
      selected: false,
      selectable: tableStore.mode === TableModes.OWN && layersStore.activeGroups[element.selectionGroup] === true,
      error: null,
    } as CanvasElementStateAsset;
  };

  const updateElementState = <T extends CanvasElementState>(elementId: string, state: Partial<T>) => {
    if (!(elementId in canvasElementsStateRegistry.value)) {
      console.warn(`Canvas element state not found for asset: ${elementId}`);
      return;
    }

    canvasElementsStateRegistry.value[elementId] = {
      ...canvasElementsStateRegistry.value[elementId],
      ...state,
    };
  };

  const deleteState = (elementId: string) => {
    delete canvasElementsStateRegistry.value[elementId];
  };

  const deselectAll = () => {
    canvasElements.value.forEach((element) => {
      updateElementState(element.id, {
        selected: false,
      });
    });
  };

  const selectElement = (elementId: string) => {
    canvasElements.value.forEach((element) => {
      if (
        !(element.id in canvasElementsStateRegistry.value) ||
        !canvasElementsStateRegistry.value[element.id].selectable
      ) {
        return;
      }

      updateElementState(element.id, {
        selected: element.id === elementId,
      });
    });
  };

  const addToSelectedElements = (elementId: string) => {
    const element = canvasElements.value.find(element => element.id === elementId);
    if (
      !element ||
      !(element.id in canvasElementsStateRegistry.value) ||
      !canvasElementsStateRegistry.value[element.id].selectable
    ) {
      return;
    }

    updateElementState(elementId, {
      selected: true,
    });
  };

  const applyContainerTransforms = (
    elementId: string,
    transforms: Partial<ElementContainerConfig>,
  ) => {
    const element = canvasElements.value.find(element => element.id === elementId);
    if (!element) {
      return;
    }

    void sceneStore.updateElement<SceneElementCanvasObject>(elementId, {
      container: transforms,
    });
  };

  const driveFileStore = useDriveFileStore();
  const batchLoadPreviewImages = async () => {
    // Only proceed with asset elements that have preview IDs
    const assetElements = canvasElements.value
      .filter(element => element.id in canvasElementsStateRegistry.value)
      .filter(isSceneElementCanvasObjectAsset)
      .filter((asset) => {
        if (asset.asset.kind === AssetPropertiesKinds.COMPLEX) {
          const registryProps = assetPropertiesRegistry.value[asset.asset.id];
          return registryProps?.preview?.id !== undefined;
        }
        return true;
      });

    const batchedIds = assetElements.map((asset) => {
      if (asset.asset.kind === AssetPropertiesKinds.COMPLEX) {
        return assetPropertiesRegistry.value[asset.asset.id]?.preview?.id;
      }
      return asset.asset.preview.id;
    }).filter(Boolean);

    if (!batchedIds.length) {
      return;
    }

    try {
      await driveFileStore.getFiles(batchedIds, DataRetrievalStrategies.RECENT);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to fetch asset previews.');
      console.error('Failed to fetch asset previews.', e);

      // set the state of the failed elements to error
      batchedIds.forEach((id) => {
        updateElementState<CanvasElementStateAsset>(id, {
          loading: false,
          loaded: false,
          error: e,
        });
      });
    }
  };

  const readyToLoadPreviews = computed(() => {
    // First ensure all elements have states
    const allElementsHaveStates = canvasElements.value.every(
      element => element.id in canvasElementsStateRegistry.value,
    );

    // Then check if complex assets are ready
    return allElementsHaveStates && complexAssetsReady.value;
  });

  const { $logger } = useNuxtApp();
  const log = $logger['canvas:elements'];
  /*
   Watch the elements on the canvas and load the previews in a single batch, accounting for the fact that the preview data for complex assets is stored in a separate collection
  */
  watch([canvasElements, readyToLoadPreviews], ([elements, ready]) => {
    log(`Canvas elements watcher activated\nElements: ${elements.length}\nReady: ${ready}`);

    // First create missing states
    const missingElements = elements.filter(
      element => !(element.id in canvasElementsStateRegistry.value),
    );

    log(`Missing elements: ${missingElements.length}`);

    missingElements.forEach(element => createAssetState(element.id));

    if (ready) {
      log('Ready to load previews');
      void batchLoadPreviewImages();
    }
  }, { immediate: true });

  watch([mode, activeGroups], () => {
    Object.values(canvasElementsStateRegistry.value).forEach((state) => {
      const element = canvasElements.value.find(element => element.id === state.id);
      if (!element) {
        return;
      }

      state.selectable = tableStore.mode === TableModes.OWN && layersStore.activeGroups[element.selectionGroup] === true;
      state.selected = state.selected && state.selectable;
    });
  }, {
    immediate: true,
    deep: true,
  });

  return {
    assetPropertiesRegistry,
    screenElements,
    canvasElements,
    canvasElementsStateRegistry,
    selectedElements,
    addComplexAssetProperties,
    removeComplexAssetProperties,
    updateElementState,
    selectElement,
    addToSelectedElements,
    deselectAll,
    createAssetState,
    deleteState,
    applyContainerTransforms,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasElementsStore, import.meta.hot));
}
