import type { ContextAction, SceneElement, SceneElementCanvasObjectAsset, SelectionGroup } from '~/models/types';
import { SelectionGroupNames, SelectionGroups, isSceneElementScreen } from '~/models/types';

const ComplexKindActionsFactory = (element: SceneElementCanvasObjectAsset) => {
  const actions: ContextAction[] = [];

  const windowStore = useWindowStore();

  actions.push({
    id: 'open-window',
    label: 'Open in window',
    icon: { name: 'open_in_new' },
    action: () => {
      const window = WindowFactory(
        element.asset.id,
        element.asset.title,
        {
          type: 'markdown',
          editing: false,
          data: undefined,
        },
      );

      windowStore.toggleOrAdd(window);
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};

const ImageKindActionsFactory = (element: SceneElementCanvasObjectAsset) => {
  const sceneStore = useSceneStore();
  const actions: ContextAction[] = [];

  actions.push({
    id: 'toggle-label',
    label: element.asset.showTitle ? 'Hide Label' : 'Show Label',
    icon: { name: element.asset.showTitle ? 'label_off' : 'label' },
    action: async () => {
      await sceneStore.updateElement<SceneElementCanvasObjectAsset>(element.id, {
        asset: {
          showTitle: !element.asset.showTitle,
        },
      });
    },
    disabled: false,
    pinned: true,
    alwaysVisible: false,
  });

  actions.push({
    id: 'edit-label',
    label: 'Edit Label',
    icon: { name: 'edit' },
    action: () => {
      const canvasContextPanelStore = useCanvasContextPanelStore();
      canvasContextPanelStore.modalShow();
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};

const getLayerRanks = (group: SelectionGroup) => {
  const sceneStore = useSceneStore();

  const layerRanks = sceneStore.sceneElements
    .filter(e => e.selectionGroup === group)
    .map(e => e.defaultRank);
  layerRanks.sort((a, b) => b - a);

  return layerRanks;
};

const hierarchyActionsFactory = (element: SceneElement) => {
  const sceneStore = useSceneStore();
  const actions: ContextAction[] = [];

  actions.push({
    id: 'move-to-top',
    label: 'To top of the layer',
    icon: { name: 'vertical_align_top' },
    action: async () => {
      const layerRanks = getLayerRanks(element.selectionGroup);
      const maxRank = layerRanks[0];

      await sceneStore.updateElement(element.id, {
        defaultRank: maxRank + 1,
      });
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  actions.push({
    id: 'move-to-bottom',
    label: 'To bottom of the layer',
    icon: { name: 'vertical_align_bottom' },
    action: async () => {
      const layerRanks = getLayerRanks(element.selectionGroup);
      const minRank = layerRanks[layerRanks.length - 1];

      await sceneStore.updateElement(element.id, {
        defaultRank: minRank - 1,
      });
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};

const groupActionsFactory = (element: SceneElementCanvasObjectAsset) => {
  const sceneStore = useSceneStore();
  const actions: ContextAction[] = [];

  const availableGroups = Object
    .values(SelectionGroups)
    .filter(group =>
      group !== SelectionGroups.SCREEN &&
      group !== element.selectionGroup);

  availableGroups.forEach((group) => {
    actions.push({
      id: `move-to-${group}`,
      label: `Move to ${SelectionGroupNames[group]} Layer`,
      icon: { name: SelectionGroupIcons[group] },
      action: () => sceneStore.updateElement(element.id, {
        selectionGroup: group,
        enabled: group !== SelectionGroups.HIDDEN,
      }),
      disabled: false,
      pinned: false,
      alwaysVisible: false,
    });
  });

  return actions;
};

export const CanvasAssetContextActionsFactory = (elementId: string) => {
  const sceneStore = useSceneStore();

  const element = sceneStore.sceneElements.find(element => element.id === elementId);

  const actions: ContextAction[] = [];

  if (!element) {
    // non-assets aren't supported for now
    return actions;
  }

  const hierarchyActions = hierarchyActionsFactory(element);
  const deleteAction = {
    id: 'delete',
    label: 'Delete',
    icon: { name: 'delete', color: 'danger' },
    action: () => sceneStore.removeElement(element),
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  };

  if (isSceneElementScreen(element)) {
    actions.push(...hierarchyActions, deleteAction);
    return actions;
  }

  if (!isSceneElementCanvasObject(element)) {
    return actions;
  }

  if (!isSceneElementCanvasObjectAsset(element)) {
    return actions;
  }

  switch (element.asset.kind) {
    case AssetPropertiesKinds.COMPLEX:
      actions.push(...ComplexKindActionsFactory(element));
      break;
    case AssetPropertiesKinds.IMAGE:
      actions.push(...ImageKindActionsFactory(element));
      break;
  }

  actions.push({
    id: 'toggle-visibility',
    label: element.enabled ? 'Hide' : 'Show',
    icon: { name: element.enabled ? 'visibility_off' : 'visibility' },
    action: () => sceneStore.updateElement(elementId, {
      enabled: !element.enabled,
      selectionGroup: element.enabled ? SelectionGroups.HIDDEN : SelectionGroups.ELEMENT,
    }),
    disabled: false,
    pinned: true,
    alwaysVisible: false,
  });

  actions.push({
    id: 'restore-size',
    label: 'Restore Native Size',
    icon: { name: 'aspect_ratio' },
    action: () => sceneStore.updateElement<SceneElementCanvasObjectAsset>(elementId, {
      container: {
        scaleX: 1,
        scaleY: 1,
      },
    }),
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  actions.push({
    id: 'fit-to-stage',
    label: 'Fit to Stage',
    icon: { name: 'crop_free' },
    action: async () => {
      const canvasStageStore = useCanvasStageStore();
      const scaledContainer = canvasStageStore.fitToStage(element.container);

      await sceneStore.updateElement<SceneElementCanvasObjectAsset>(elementId, {
        container: scaledContainer,
      });
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  actions.push(...groupActionsFactory(element));
  actions.push(...hierarchyActions);
  actions.push(deleteAction);

  actions.push();

  return actions;
};
