import type Konva from 'konva';
import type { IKonvaComponent } from '~/models/types';

export const useCanvasStageStore = defineStore('canvas-stage', () => {
  const _stageNode = ref<IKonvaComponent<Konva.Node> | null>(null);
  const stage = computed(() => _stageNode.value?.getStage());
  const _stage = ref<Partial<Konva.StageConfig>>({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    width: 0,
    height: 0,
    draggable: false,
  });

  const applyConfig = (config: Partial<Konva.StageConfig>) => {
    Object.assign(_stage.value, config);
  };

  return {
    _stageNode,
    _stage,
    stage,
    applyConfig,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasStageStore, import.meta.hot));
}
