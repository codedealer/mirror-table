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

  const layers = computed(() => {
    const layers: LayerItem<SceneElement | LayerGroup>[] = [];

    if (!sceneStore.sceneElements) {
      return layers;
    }

    let currentSelectionGroup: SelectionGroup | undefined;
    let currentLayerGroup: LayerGroup | undefined;

    const reversedElements = [...sceneStore.sceneElements].reverse();

    for (const sceneElement of reversedElements) {
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

  return {
    layers,
    activeGroups,
    toggleGroup,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useLayersStore, import.meta.hot),
  );
}
