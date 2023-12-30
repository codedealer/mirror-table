import type Konva from 'konva';
import type { CanvasElementStateAsset } from '~/models/types';

export const useCanvasAssetPointerEvents = (
  state: Ref<CanvasElementStateAsset | undefined>,
) => {
  const canvasStageStore = useCanvasStageStore();
  const canvasContextPanelStore = useCanvasContextPanelStore();

  const onHover = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!state.value || !state.value?.selectable) {
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
  const onHoverOut = () => {
    canvasContextPanelStore.hide();
  };

  return {
    onHover,
    onHoverOut,
  };
};
