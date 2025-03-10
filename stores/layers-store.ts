import type {
  LayerGroup,
  LayerItem,
  SceneElement,
  SelectionGroup,
} from '~/models/types';
import {
  SelectionGroupIcons,
  SelectionGroupNames,
} from '~/models/types';

export const useLayersStore = defineStore('layers', () => {
  const sceneStore = useSceneStore();

  // by default OWNER can see hidden elements
  const hideHiddenElements = ref(false);

  const layers = computed(() => {
    const layers: LayerItem<SceneElement | LayerGroup>[] = [];

    if (!sceneStore.sceneElements) {
      return layers;
    }

    let currentSelectionGroup: SelectionGroup | undefined;
    let currentLayerGroup: LayerGroup | undefined;

    for (let i = sceneStore.sceneElements.length - 1; i >= 0; i--) {
      const sceneElement = sceneStore.sceneElements[i];

      if (sceneElement.selectionGroup !== currentSelectionGroup) {
        currentSelectionGroup = sceneElement.selectionGroup;
        currentLayerGroup = {
          name: SelectionGroupNames[currentSelectionGroup],
          icon: SelectionGroupIcons[currentSelectionGroup],
        };
        layers.push({
          id: currentLayerGroup.name,
          type: 'group',
          item: currentLayerGroup,
        });
      }

      layers.push({
        id: sceneElement.id,
        type: 'element',
        item: sceneElement,
      });
    }

    return layers;
  });

  const activeGroups = ref<{ [K in SelectionGroup]?: boolean }>({});

  for (const group of Object.values(SelectionGroups)) {
    activeGroups.value[group] = true;
  }

  const toggleGroup = (group: SelectionGroup) => {
    activeGroups.value[group] = !activeGroups.value[group];
  };

  const toggleHiddenElements = () => {
    hideHiddenElements.value = !hideHiddenElements.value;

    // update the selectable state of elements on the hidden layer
    /* const canvasElementsStore = useCanvasElementsStore(); // get the store here to avoid cyclical ref
    const hiddenElements = sceneStore.sceneElements.filter(element => element.selectionGroup === SelectionGroups.HIDDEN);
    if (hideHiddenElements.value) {
      hiddenElements.forEach((element) => {
        canvasElementsStore.updateElementState(element.id, {
          selectable: false,
          selected: false,
        });
      });
    } else if (activeGroups.value[SelectionGroups.HIDDEN]) {
      hiddenElements.forEach((element) => {
        canvasElementsStore.updateElementState(element.id, {
          selectable: true,
        });
      });
    } */
  };

  return {
    layers,
    activeGroups,
    toggleGroup,
    hideHiddenElements,
    toggleHiddenElements,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useLayersStore, import.meta.hot),
  );
}
