import type {
  AssetProperties,
  CanvasObjectSceneMoveInteraction,
  ContextAction,
  SceneElement, SceneElementCanvasObject,
  SceneElementCanvasObjectAsset,
  SelectionGroup,
} from '~/models/types';
import { SelectionGroupNames, SelectionGroups, isSceneElementScreen } from '~/models/types';
import updateComplexAssetProperties from '~/utils/updateComplexAssetProperties';

const ComplexKindActionsFactory = (element: SceneElementCanvasObjectAsset) => {
  const actions: ContextAction[] = [];
  const { properties } = useCanvasAssetProperties(ref(element));

  actions.push({
    id: 'open-window',
    label: 'Open in window',
    icon: { name: 'open_in_new' },
    action: () => {
      const windowStore = useWindowStore();
      const window = WindowFactory(
        properties.value.id,
        properties.value.title,
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

  actions.push({
    id: 'toggle-label',
    label: properties.value.showTitle ? 'Hide Label' : 'Show Label',
    icon: { name: properties.value.showTitle ? 'label_off' : 'label' },
    action: async () => {
      const payload: AssetProperties = {
        type: properties.value.type,
        title: properties.value.title,
        showTitle: !properties.value.showTitle,
        kind: properties.value.kind,
        preview: properties.value.preview,
      };
      await updateComplexAssetProperties(properties.value.id, payload);
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
      canvasContextPanelStore.modalShow(element.id);
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};

const InteractionActionsFactory = (element: SceneElementCanvasObjectAsset) => {
  const sceneStore = useSceneStore();
  const actions: ContextAction[] = [];

  if (element.interaction?.enabled) {
    actions.push({
      id: 'trigger-interaction',
      label: element.interaction.tooltip ?? 'Trigger Interaction',
      icon: { name: 'touch_app' },
      action: async () => {
        if (element.interaction?.action !== 'scene-move') {
          const notificationStore = useNotificationStore();
          notificationStore.error(`Unsupported interaction: ${element.interaction?.action}`);
          return;
        }

        const tableStore = useTableStore();
        if (!tableStore.sessionId) {
          return;
        }

        const sceneInteraction = element.interaction as CanvasObjectSceneMoveInteraction;
        // this can move to a non-existent scene
        await tableStore.setActiveScene(tableStore.sessionId, sceneInteraction.payload);
      },
      disabled: !element.interaction.enabled,
      pinned: true,
      alwaysVisible: false,
    });
  } else {
    actions.push({
      id: 'create-interaction',
      label: 'Make interactive',
      icon: { name: 'touch_app' },
      action: async () => {
        const sceneSearchStore = useSceneSearchStore();
        try {
          const scene = await sceneSearchStore.promptToSearch();

          if (!isScene(scene)) {
            return;
          }

          const interaction: CanvasObjectSceneMoveInteraction = {
            action: 'scene-move',
            enabled: true,
            payload: {
              id: scene.id,
              path: scene.path.slice(),
            },
            tooltip: `Go to ${scene.title}`,
          };

          await sceneStore.updateElement<SceneElementCanvasObjectAsset>(element.id, {
            interaction,
          });
        } catch (e) {
          if (isObject(e) && typeof e.message === 'string') {
            const notificationStore = useNotificationStore();
            notificationStore.error(e.message);
          }
        }
      },
      disabled: false,
      pinned: false,
      alwaysVisible: false,
    });
  }

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
      canvasContextPanelStore.modalShow(element.id);
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  actions.push(...InteractionActionsFactory(element));

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

const groupActionsFactory = (element: SceneElementCanvasObject) => {
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
    return actions;
  }

  const hierarchyActions = hierarchyActionsFactory(element);
  const deleteAction = {
    id: 'delete',
    label: 'Delete',
    icon: { name: 'delete', color: 'danger' },
    action: async () => {
      await sceneStore.removeElement(element);

      // the element will be destroyed, so we need to hide the panel
      // because there will be no OnHoverOut event
      const canvasContextPanelStore = useCanvasContextPanelStore();
      canvasContextPanelStore.hide();
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  };

  if (isSceneElementScreen(element)) {
    actions.push({
      id: 'toggle-visibility',
      label: element.enabled ? 'Hide' : 'Show',
      icon: { name: element.enabled ? 'visibility_off' : 'visibility' },
      action: () => sceneStore.updateElement(elementId, {
        enabled: !element.enabled,
      }),
      disabled: false,
      pinned: true,
      alwaysVisible: !element.enabled,
    });

    actions.push(...hierarchyActions, deleteAction);
    return actions;
  }

  if (!isSceneElementCanvasObject(element)) {
    return actions;
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
  actions.push(...groupActionsFactory(element));
  actions.push(...hierarchyActions);
  actions.push(deleteAction);

  if (!isSceneElementCanvasObjectAsset(element)) {
    return actions;
  }

  actions.unshift({
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

  actions.unshift({
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

  switch (element.asset.kind) {
    case AssetPropertiesKinds.COMPLEX:
      actions.unshift(...ComplexKindActionsFactory(element));
      break;
    case AssetPropertiesKinds.IMAGE:
      actions.unshift(...ImageKindActionsFactory(element));
      break;
  }

  return actions;
};
