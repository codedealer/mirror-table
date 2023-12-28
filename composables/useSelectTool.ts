import type Konva from 'konva';
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
      elementsStore.deselectAll();
    } else {
      const container = getElementContainer(e.target as Konva.Shape);

      if (!container) {
        return;
      }

      const elementId = container.id();

      elementsStore.selectElement(elementId);
    }
  };

  const selectTool: CanvasTool = {
    id: 'select',
    name: 'Select',
    icon: 'highlight_alt',
    disabled: false,
    active: false,
    events: new Map([
      ['pointerdown', onClick],
    ]),
    component: markRaw(defineAsyncComponent(() => import('~/components/TheSceneCanvasToolSelect.vue'))),
  };

  const toolStore = useCanvasToolStore();

  toolStore.registerTool(selectTool);

  return selectTool;
};
