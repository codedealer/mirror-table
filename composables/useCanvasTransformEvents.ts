import type Konva from 'konva';
import type { ElementContainerConfig } from '~/models/types';

export const useCanvasTransformEvents = () => {
  const canvasStageStore = useCanvasStageStore();
  const canvasToolStore = useCanvasToolStore();
  const canvasElementsStore = useCanvasElementsStore();

  const onKonvaEvent = (e: Konva.KonvaEventObject<unknown>) => {
    if (!canvasStageStore.stage) {
      return;
    }

    canvasToolStore.handleToolEvent(e.type, e);
  };

  const onNodeTransformEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onKonvaEvent(e);

    const node = e.target as Konva.Node;
    const id = node.id();

    const transforms: Partial<ElementContainerConfig> = {
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    };

    if (id === '_stage') {
      canvasStageStore._offset = {
        x: node.x() + canvasStageStore._scroll.x,
        y: node.y() + canvasStageStore._scroll.y,
      };

      canvasStageStore.applyConfig(transforms);
    } else {
      // assume this is an element's container id,
      // so we save the node's position as well
      transforms.x = node.x();
      transforms.y = node.y();

      try {
        canvasElementsStore.applyContainerTransforms(id, transforms);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return {
    onKonvaEvent,
    onNodeTransformEnd,
  };
};
