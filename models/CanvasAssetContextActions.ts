import type { ContextAction, SceneElementCanvasObjectAsset } from '~/models/types';
import { SelectionGroups } from '~/models/types';

export const CanvasAssetContextActionsFactory = (elementId: string) => {
  const canvasElementsStore = useCanvasElementsStore();
  const sceneStore = useSceneStore();

  const element = canvasElementsStore.canvasElements.find(element => element.id === elementId);

  const actions: ContextAction[] = [];

  if (!element || !isSceneElementCanvasObjectAsset(element)) {
    // non-assets aren't supported for now
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

  return actions;
};
