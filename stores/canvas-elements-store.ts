import type { ComputedRef } from 'vue';
import { TableModes, isSceneElementCanvasObject, isSceneElementCanvasObjectAsset } from '~/models/types';
import type {
  CanvasElementState, CanvasElementStateAsset,
  ElementContainerConfig,
  SceneElementCanvasObject,
  SceneElementScreen,
} from '~/models/types';

export const useCanvasElementsStore = defineStore('canvas-elements', () => {
  const sceneStore = useSceneStore();

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

  const layersStore = useLayersStore();
  const tableStore = useTableStore();

  const { activeGroups } = storeToRefs(layersStore);
  const { mode } = storeToRefs(tableStore);

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
  // create states for all new elements
  watch(canvasElements, async (elements) => {
    const missingElements = elements.filter(element => !(element.id in canvasElementsStateRegistry.value));

    missingElements.forEach((element) => {
      // assumes all elements are assets
      createAssetState(element.id);
    });

    // get all the drive file ids that should be batched
    const batchedIds = missingElements
      .filter(isSceneElementCanvasObjectAsset)
      .map(asset => asset.asset.preview.id);
    // for the owner also include asset ids for label watcher
    if (tableStore.mode === TableModes.OWN) {
      batchedIds.push(
        ...missingElements
          .filter(isSceneElementCanvasObjectAsset)
          .filter(asset => asset.asset.kind === AssetPropertiesKinds.COMPLEX)
          .map(asset => asset.asset.id),
      );
    }
    if (!batchedIds.length) {
      return;
    }

    try {
      await driveFileStore.getFiles(batchedIds, DataRetrievalStrategies.RECENT);
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Failed to fetch asset previews.');

      // set the state of the failed elements to error
      batchedIds.forEach((id) => {
        updateElementState<CanvasElementStateAsset>(id, {
          loading: false,
          loaded: false,
          error: e,
        });
      });
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
    screenElements,
    canvasElements,
    canvasElementsStateRegistry,
    selectedElements,
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
