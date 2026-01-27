import type { ContextAction } from '~/models/types';

export type RightClickTarget =
  | { type: 'element'; elementId: string }
  | { type: 'canvas'; position: { stageX: number; stageY: number } }
  | null;

export const useCanvasRightClickStore = defineStore('canvas-right-click', () => {
  const visible = ref(false);
  const position = ref({ x: 0, y: 0 });
  const target = ref<RightClickTarget>(null);
  const actions = ref<ContextAction[]>([]);

  const show = (
    screenX: number,
    screenY: number,
    targetInfo: RightClickTarget,
    menuActions: ContextAction[],
  ) => {
    position.value = { x: screenX, y: screenY };
    target.value = targetInfo;
    actions.value = menuActions;
    visible.value = true;
  };

  const hide = () => {
    visible.value = false;
    target.value = null;
    actions.value = [];
  };

  return {
    visible,
    position,
    target,
    actions,
    show,
    hide,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasRightClickStore, import.meta.hot));
}
