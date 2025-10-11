import type Konva from 'konva';
import type { CanvasElementStateAsset } from '~/models/types';

export const useCanvasAssetPointerEvents = (
  state: Ref<CanvasElementStateAsset | undefined>,
) => {
  const canvasStageStore = useCanvasStageStore();
  const canvasContextPanelStore = useCanvasContextPanelStore();

  const onHover = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!state.value || !state.value?.selectable || !state.value?.loaded) {
      return;
    }

    const container = getElementContainer(e.target as Konva.Shape);

    if (!container || !canvasStageStore.stage) {
      return;
    }

    let pos = container.getAbsolutePosition();
    pos = {
      x: pos.x - canvasStageStore.fieldPadding,
      y: pos.y - canvasStageStore.fieldPadding,
    };

    canvasContextPanelStore.show(container.id(), pos.x, pos.y);
  };
  const onHoverOut = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if pointer is actually over the context panel before hiding
    const evt = e.evt as MouseEvent;
    const elementAtPoint = document.elementFromPoint(evt.clientX, evt.clientY);

    // If cursor is over the panel or its children, don't hide
    if (elementAtPoint?.closest('.canvas-context-panel')) {
      return;
    }

    canvasContextPanelStore.hide();
  };

  return {
    onHover,
    onHoverOut,
  };
};
