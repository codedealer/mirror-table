import type Konva from 'konva';
import type { CanvasTool } from '~/models/types';

export const useTextTool = () => {
  const stageStore = useCanvasStageStore();
  const sceneStore = useSceneStore();
  const toolStore = useCanvasToolStore();

  let startX: number | undefined;
  let startY: number | undefined;

  const onPointerDown = (event: Konva.KonvaEventObject<unknown>) => {
    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;
    if (!stageStore.stage || !stageStore.selectionRect) {
      return;
    }

    e.evt.preventDefault();

    const pos = stageStore.stage.getRelativePointerPosition();
    startX = pos?.x;
    startY = pos?.y;

    // Set up selection rect for preview
    stageStore.selectionRect.setAttrs({
      visible: true,
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      stroke: '#fa45ab',
      strokeWidth: 1,
      dash: [5, 5],
      fill: 'rgba(250, 69, 171, 0.1)',
    });
  };

  const onPointerMove = (event: Konva.KonvaEventObject<unknown>) => {
    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;
    if (!stageStore.stage || !stageStore.selectionRect || !startX || !startY) {
      return;
    }

    e.evt.preventDefault();
    const pos = stageStore.stage.getRelativePointerPosition();
    if (!pos) {
      return;
    }

    // Update preview rectangle size while dragging
    stageStore.selectionRect.setAttrs({
      x: Math.min(startX, pos.x),
      y: Math.min(startY, pos.y),
      width: Math.abs(pos.x - startX),
      height: Math.abs(pos.y - startY),
    });
  };

  const onPointerUp = async (event: Konva.KonvaEventObject<unknown>) => {
    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;
    if (!sceneStore.scene || !stageStore.stage || !stageStore.selectionRect || startX === undefined || startY === undefined) {
      return;
    }

    e.evt.preventDefault();

    const pos = stageStore.stage.getRelativePointerPosition();
    if (!pos) {
      return;
    }

    // Hide the selection rect
    requestAnimationFrame(() => {
      stageStore.selectionRect?.visible(false);
    });

    // Calculate dimensions - use default size for click, custom size for drag
    const isClick = Math.abs(pos.x - startX) < 5 && Math.abs(pos.y - startY) < 5;
    const width = isClick ? 200 : Math.abs(pos.x - startX);
    const height = isClick ? 100 : Math.abs(pos.y - startY);
    // Calculate the center position for the text element
    const centerX = isClick ? startX : Math.min(startX, pos.x) + width / 2;
    const centerY = isClick ? startY : Math.min(startY, pos.y) + height / 2;

    await sceneStore.addText(
      { x: centerX, y: centerY },
      isClick ? undefined : { width, height },
    );

    // Reset start positions
    startX = undefined;
    startY = undefined;

    const selectTool = toolStore.tools.find(tool => tool.id === 'select');
    if (selectTool) {
      toolStore.setActiveTool(selectTool);
    }
  };

  const textTool: CanvasTool = {
    id: 'text',
    name: 'Text',
    icon: 'text_fields',
    disabled: false,
    active: false,
    events: new Map([
      ['pointerdown', onPointerDown],
      ['pointermove', onPointerMove],
      ['pointerup', onPointerUp],
      ['touchstart', onPointerDown],
      ['touchmove', onPointerMove],
      ['touchend', onPointerUp],
    ]),
    component: markRaw(defineAsyncComponent(() => import('~/components/TheSceneCanvasToolText.vue'))),
  };

  toolStore.registerTool(textTool);

  return textTool;
};
