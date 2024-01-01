import type { ContextAction, SceneElementCanvasObjectAsset } from '~/models/types';
import { SelectionGroups } from '~/models/types';

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
    alwaysVisible: true,
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

export const CanvasAssetContextActionsFactory = (elementId: string) => {
  const canvasElementsStore = useCanvasElementsStore();
  const sceneStore = useSceneStore();
  const canvasStageStore = useCanvasStageStore();

  const element = canvasElementsStore.canvasElements.find(element => element.id === elementId);

  const actions: ContextAction[] = [];

  if (!element || !isSceneElementCanvasObjectAsset(element)) {
    // non-assets aren't supported for now
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
    alwaysVisible: true,
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
      const scaledContainer = canvasStageStore.fitToStage(element.container);

      await sceneStore.updateElement<SceneElementCanvasObjectAsset>(elementId, {
        container: scaledContainer,
      });
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  actions.push({
    id: 'delete',
    label: 'Delete',
    icon: { name: 'delete', color: 'danger' },
    action: () => sceneStore.removeElement(element),
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};
