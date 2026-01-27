import type Konva from 'konva';
import type { RightClickTarget } from '~/stores/canvas-right-click-store';

export const useCanvasRightClick = () => {
  const canvasStageStore = useCanvasStageStore();
  const canvasRightClickStore = useCanvasRightClickStore();

  const onContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    // Prevent the default browser context menu
    e.evt.preventDefault();

    if (!canvasStageStore.stage) {
      return;
    }

    // Get the position in screen coordinates (for menu placement)
    const screenX = e.evt.clientX;
    const screenY = e.evt.clientY;

    // Get the position in stage coordinates (for action context)
    const stagePos = canvasStageStore.stage.getRelativePointerPosition();
    if (!stagePos) {
      return;
    }

    // Determine what was clicked
    const clickedOnEmpty = e.target === canvasStageStore.stage;

    let target: RightClickTarget;

    if (clickedOnEmpty) {
      // Right-clicked on empty canvas
      target = {
        type: 'canvas',
        position: {
          stageX: stagePos.x,
          stageY: stagePos.y,
        },
      };
    } else {
      // Right-clicked on an element - find the container
      const container = getElementContainer(e.target as Konva.Shape);
      if (!container) {
        return;
      }

      const elementId = container.id();
      if (!elementId) {
        return;
      }

      target = {
        type: 'element',
        elementId,
      };
    }

    // Get the actions for this target
    const actions = getRightClickActions(target);

    if (actions.length === 0) {
      return;
    }

    // Show the context menu
    canvasRightClickStore.show(screenX, screenY, target, actions);
  };

  return {
    onContextMenu,
  };
};
