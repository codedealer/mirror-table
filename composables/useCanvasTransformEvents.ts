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

  const onNodeTransformEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    onKonvaEvent(e);

    const node = e.target as Konva.Node;
    const id = node.id();
    if (!id) {
      // if the node doesn't have an id, we don't touch it (likely a transformer or utility node)
      return;
    }

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
      transforms.width = node.width();
      transforms.height = node.height();

      try {
        await canvasElementsStore.applyContainerTransforms(id, transforms);
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
