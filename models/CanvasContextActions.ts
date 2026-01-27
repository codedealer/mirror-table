import type { ContextAction, TableSessionPresence } from '~/models/types';
import type { RightClickTarget } from '~/stores/canvas-right-click-store';

/**
 * Factory for creating context actions when right-clicking on the empty canvas area.
 * @param stagePosition - The position on the canvas stage where the click occurred
 */
export const CanvasEmptyContextActionsFactory = (stagePosition: { stageX: number; stageY: number }): ContextAction[] => {
  const actions: ContextAction[] = [];
  const sessionStore = useSessionStore();
  const tableStore = useTableStore();

  const { privateSessions } = storeToRefs(sessionStore);

  // Add asset at this position (placeholder - TODO: integrate with drive picker)
  actions.push({
    id: 'add-asset-here',
    label: 'Add Asset Here',
    icon: { name: 'add_photo_alternate' },
    action: () => {
      const notificationStore = useNotificationStore();
      notificationStore.success(`Add asset at position (${Math.round(stagePosition.stageX)}, ${Math.round(stagePosition.stageY)}) - coming soon`);
    },
    disabled: false,
    pinned: false,
    alwaysVisible: false,
  });

  // Add text element at this position (placeholder - TODO: integrate with text tool)
  actions.push({
    id: 'add-text-here',
    label: 'Add Text Here',
    icon: { name: 'text_fields' },
    action: () => {
      const notificationStore = useNotificationStore();
      notificationStore.success(`Add text at position (${Math.round(stagePosition.stageX)}, ${Math.round(stagePosition.stageY)}) - coming soon`);
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
      if (!tableStore.table || !privateSessions.value.length) {
        return;
      }

      const canvasStageStore = useCanvasStageStore();
      const stageWidth = canvasStageStore.stage?.width() ?? 0;
      const stageHeight = canvasStageStore.stage?.height() ?? 0;

      const updates: { [sessionId: string]: TableSessionPresence } = {};

      privateSessions.value.forEach((session) => {
        if (!session.screen) {
          return;
        }

        const { width, height } = session.screen;
        if (width <= 0 || height <= 0) {
          return;
        }

        // Center the screen around the click point
        let newX = stagePosition.stageX - width / 2;
        let newY = stagePosition.stageY - height / 2;

        // Constrain within the stage boundaries
        newX = Math.floor(Math.max(0, Math.min(newX, stageWidth - width)));
        newY = Math.floor(Math.max(0, Math.min(newY, stageHeight - height)));

        const updatedSession = structuredClone(toRaw(session));
        updatedSession.screen = { ...updatedSession.screen!, x: newX, y: newY };
        updates[updatedSession.sessionId] = updatedSession;
      });

      try {
        await tableStore.updateSessionPresence(tableStore.table.id, updates);
      } catch (error) {
        console.error(error);
        const notificationStore = useNotificationStore();
        notificationStore.error('Failed to move screen frames');
      }
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
