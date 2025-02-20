import Konva from 'konva';
import type { CanvasTool } from '~/models/types';

export const useSelectTool = () => {
  const store = useCanvasStageStore();
  const elementsStore = useCanvasElementsStore();

  const onClick = (event: Konva.KonvaEventObject<unknown>) => {
    if (!store.selectionRect || store.selectionRect.visible()) {
      return;
    }

    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;

    const clickedOnEmpty = e.target === store.stage;

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

    if (!store.stage || !store.selectionRect) {
      return;
    }
    // reset the coordinate variables
    x1 = x2 = y1 = y2 = undefined;

    // don't show selection box if element is already selected
    if (
      e.target.getParent()?.className === 'Transformer' ||
      (elementState && elementState.selected)
    ) {
      return;
    }

    e.evt.preventDefault();
    x2 = x1 = store.stage.getRelativePointerPosition()?.x;
    y2 = y1 = store.stage.getRelativePointerPosition()?.y;

    store.selectionRect.setAttrs({
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
    if (!store.stage || !store.selectionRect || !store.selectionRect.visible()) {
      return;
    }

    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;

    e.evt.preventDefault();
    x2 = store.stage.getRelativePointerPosition()?.x;
    y2 = store.stage.getRelativePointerPosition()?.y;

    if (
      x2 === undefined ||
      y2 === undefined ||
      x1 === undefined ||
      y1 === undefined
    ) {
      store.selectionRect.visible(false);
      return;
    }

    store.selectionRect.setAttrs({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
  };

  const onSelectionDragEnd = (event: Konva.KonvaEventObject<unknown>) => {
    const e = event as Konva.KonvaEventObject<MouseEvent | TouchEvent>;
    if (!store.stage || !store.selectionRect) {
      return;
    }

    // simulate click event
    if (x1 !== undefined && y1 !== undefined && x1 === x2 && y1 === y2) {
      store.selectionRect.visible(false);
      onClick(e);
      return;
    }

    if (!store.selectionRect.visible()) {
      return;
    }

    e.evt.preventDefault();
    // hide the selection box in the next frame
    // in case click event is fired right after drag end
    requestAnimationFrame(() => {
      store.selectionRect?.visible(false);
    });

    const box = store.selectionRect.getClientRect();
    const selectedShapes = store.selectionRect
      .getLayer()
      ?.find((shape: Konva.Node) => {
        if (shape === store.selectionRect) {
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
