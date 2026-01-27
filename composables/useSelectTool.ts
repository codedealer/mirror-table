import type { CanvasTool } from '~/models/types';
import Konva from 'konva';

export const useSelectTool = () => {
  const stageStore = useCanvasStageStore();
  const elementsStore = useCanvasElementsStore();
  const sessionStore = useSessionStore();
  const tableStore = useTableStore();
  const { privateSessions } = storeToRefs(sessionStore);

  const moveFrame = async (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!stageStore.stage || !tableStore.table || !privateSessions.value.length) {
      return;
    }

    const { x, y } = event.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };

    // Convert pointer position to stage coordinates (account for scroll offset)
    await sessionStore.movePrivateScreensToPosition({
      x: x + stageStore._scroll.x,
      y: y + stageStore._scroll.y,
    });
  };

  const onClick = (event: Konva.KonvaEventObject<unknown>) => {
    if (!stageStore.selectionRect || stageStore.selectionRect.visible()) {
      return;
    }

    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;

    if (e.evt.shiftKey) {
      return moveFrame(e);
    }

    const clickedOnEmpty = e.target === stageStore.stage;

    if (clickedOnEmpty) {
      if (!elementsStore.selectedElements.length) {
        return;
      }

      elementsStore.deselectAll();
    } else {
      const container = getElementContainer(e.target as Konva.Shape);

      if (!container) {
        return;
      }

      const elementId = container.id();

      const isModifierPressed = e.evt.ctrlKey || e.evt.metaKey;

      if (isModifierPressed) {
        elementsStore.addToSelectedElements(elementId);
      } else {
        elementsStore.selectElement(elementId);
      }
    }
  };

  let x1: number | undefined,
    y1: number | undefined,
    x2: number | undefined,
    y2: number | undefined;
  const onSelectionDragStart = (event: Konva.KonvaEventObject<unknown>) => {
    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;
    const container = getElementContainer(e.target as Konva.Shape);
    const elementState = container && elementsStore.canvasElementsStateRegistry[container.id()];

    if (!stageStore.stage || !stageStore.selectionRect) {
      return;
    }
    // reset the coordinate variables
    x1 = x2 = y1 = y2 = undefined;

    // don't show selection box if element is already selected
    if (
      e.target.getParent()?.className === 'Transformer'
      || (elementState && elementState.selected)
    ) {
      return;
    }

    e.evt.preventDefault();
    x2 = x1 = stageStore.stage.getRelativePointerPosition()?.x;
    y2 = y1 = stageStore.stage.getRelativePointerPosition()?.y;

    stageStore.selectionRect.setAttrs({
      visible: true,
      width: 0,
      height: 0,
      stroke: 'white',
      strokeWidth: 1,
      dash: [5, 5],
      fill: 'rgba(255, 255, 255, 0.1)',
    });
  };

  const onSelectionDragMove = (event: Konva.KonvaEventObject<unknown>) => {
    if (!stageStore.stage || !stageStore.selectionRect || !stageStore.selectionRect.visible()) {
      return;
    }

    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;

    e.evt.preventDefault();
    x2 = stageStore.stage.getRelativePointerPosition()?.x;
    y2 = stageStore.stage.getRelativePointerPosition()?.y;

    if (
      x2 === undefined
      || y2 === undefined
      || x1 === undefined
      || y1 === undefined
    ) {
      stageStore.selectionRect.visible(false);
      return;
    }

    stageStore.selectionRect.setAttrs({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
  };

  const onSelectionDragEnd = (event: Konva.KonvaEventObject<unknown>) => {
    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;
    if (!stageStore.stage || !stageStore.selectionRect) {
      return;
    }

    // simulate click event
    if (x1 !== undefined && y1 !== undefined && x1 === x2 && y1 === y2) {
      stageStore.selectionRect.visible(false);
      void onClick(e);
      return;
    }

    if (!stageStore.selectionRect.visible()) {
      return;
    }

    e.evt.preventDefault();
    // hide the selection box in the next frame
    // in case click event is fired right after drag end
    requestAnimationFrame(() => {
      stageStore.selectionRect?.visible(false);
    });

    const box = stageStore.selectionRect.getClientRect();
    const selectedShapes = stageStore.selectionRect
      .getLayer()
      ?.find((shape: Konva.Node) => {
        if (shape === stageStore.selectionRect) {
          return false;
        }
        if (
          !elementsStore.canvasElements.map(e => e.id).includes(shape.id())
        ) {
          return false;
        }

        return Konva.Util.haveIntersection(box, shape.getClientRect());
      });

    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      elementsStore.deselectAll();
    }
    selectedShapes?.forEach((shape: Konva.Node) => {
      elementsStore.addToSelectedElements(shape.id());
    });
  };

  const selectTool: CanvasTool = {
    id: 'select',
    name: 'Select',
    icon: 'highlight_alt',
    disabled: false,
    active: false,
    events: new Map([
      ['pointerdown', onSelectionDragStart],
      ['touchstart', onSelectionDragStart],
      ['pointermove', onSelectionDragMove],
      ['touchmove', onSelectionDragMove],
      ['pointerup', onSelectionDragEnd],
      ['touchend', onSelectionDragEnd],
    ]),
    component: markRaw(defineAsyncComponent(() => import('~/components/TheSceneCanvasToolSelect.vue'))),
  };

  const toolStore = useCanvasToolStore();

  toolStore.registerTool(selectTool);

  return selectTool;
};
