import type Konva from 'konva';
import type { CanvasTool } from '~/models/types';

export const useCanvasToolStore = defineStore('canvas-tool', () => {
  const tools = ref<CanvasTool[]>([]);
  const activeTool = ref<CanvasTool | null>(null);

  const registerTool = (tool: CanvasTool) => {
    if (tools.value.find(t => t.id === tool.id)) {
      return;
    }

    tools.value.push(tool);
  };

  const setActiveTool = (tool: CanvasTool | null) => {
    activeTool.value = tool;
  };

  const handleToolEvent = (
    event: string,
    e: Konva.KonvaEventObject<unknown>,
  ) => {
    if (!activeTool.value) {
      return;
    }

    if (activeTool.value.events.has(event)) {
      activeTool.value.events.get(event)!(e);
    }
  };

  return {
    tools,
    activeTool,
    registerTool,
    setActiveTool,
    handleToolEvent,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasToolStore, import.meta.hot));
}
