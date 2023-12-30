export const useCanvasContextPanelStore = defineStore('canvas-context-panel', () => {
  const visible = ref(false);

  const position = ref({
    x: 0,
    y: 0,
  });

  const elementId = ref('');

  const show = (id: string, x: number, y: number) => {
    elementId.value = id;
    position.value = {
      x,
      y,
    };
    visible.value = true;
  };

  const hide = () => {
    elementId.value = '';
    visible.value = false;
  };

  return {
    visible,
    position,
    elementId,
    show,
    hide,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasContextPanelStore, import.meta.hot));
}
