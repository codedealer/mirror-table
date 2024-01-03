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

  return {
    layers,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useLayersStore, import.meta.hot),
  );
}
