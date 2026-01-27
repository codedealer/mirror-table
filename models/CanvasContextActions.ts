import type { ContextAction } from '~/models/types';
import type { RightClickTarget } from '~/stores/canvas-right-click-store';

/**
 * Factory for creating context actions when right-clicking on the empty canvas area.
 * @param stagePosition - The position on the canvas stage where the click occurred
 */
export const CanvasEmptyContextActionsFactory = (stagePosition: { stageX: number; stageY: number }): ContextAction[] => {
  const actions: ContextAction[] = [];
  const sessionStore = useSessionStore();
  const sceneStore = useSceneStore();

  const { privateSessions } = storeToRefs(sessionStore);

  // Add asset at this position - opens asset search modal
  actions.push({
    id: 'add-asset-here',
    label: 'Add Asset Here',
    icon: { name: 'add_photo_alternate' },
    action: async () => {
      const driveSearchStore = useDriveSearchStore();

      try {
        const file = await driveSearchStore.promptToSearch('assets');

        if (!isDriveAsset(file)) {
          const notificationStore = useNotificationStore();
          notificationStore.error('Selected file is not an asset');
          return;
        }

        await sceneStore.addAsset(file, {
          x: stagePosition.stageX,
          y: stagePosition.stageY,
        });
      } catch (e) {
        // User cancelled the search - do nothing
        if (isObject(e) && e.message === 'Search cancelled') {
          return;
        }
        console.error(e);
      }
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  // Add text element at this position
  actions.push({
    id: 'add-text-here',
    label: 'Add Text Here',
    icon: { name: 'text_fields' },
    action: async () => {
      await sceneStore.addText({
        x: stagePosition.stageX,
        y: stagePosition.stageY,
      });
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  // Move all private session screens here
  actions.push({
    id: 'move-screens-here',
    label: 'Move All Screens Here',
    icon: { name: 'screenshot_monitor' },
    action: async () => {
      await sessionStore.movePrivateScreensToPosition({
        x: stagePosition.stageX,
        y: stagePosition.stageY,
      });
    },
    disabled: !privateSessions.value.length,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};

/**
 * Get actions based on the right-click target
 */
export const getRightClickActions = (target: RightClickTarget): ContextAction[] => {
  if (!target) {
    return [];
  }

  if (target.type === 'canvas') {
    return CanvasEmptyContextActionsFactory(target.position);
  }

  if (target.type === 'element') {
    // Reuse the existing element context actions
    return CanvasAssetContextActionsFactory(target.elementId);
  }

  return [];
};
