export const useCanvasContextPanelStore = defineStore('canvas-context-panel', () => {
  const visible = ref(false);

  const position = ref({
    x: 0,
    y: 0,
  });

  const show = (x: number, y: number) => {
    position.value = {
      x,
      y,
    };
    visible.value = true;
  };

  const hide = () => {
    visible.value = false;
  };

  return {
    visible,
    position,
    show,
    hide,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasContextPanelStore, import.meta.hot));
}
