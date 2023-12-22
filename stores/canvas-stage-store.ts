import type Konva from 'konva';
import type { KonvaComponent } from '~/models/types';

export const useCanvasStageStore = defineStore('canvas-stage', () => {
  const _stageNode = ref<KonvaComponent<Konva.Node> | null>(null);
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

  const _offset = ref({ x: 0, y: 0 });
  const _scroll = ref({ x: 0, y: 0 });

  const fieldWidth = ref(3000);
  const fieldHeight = ref(3000);
  const fieldPadding = ref(500);

  const stageConfig = computed(() => {
    return {
      ..._stage.value,
      x: _offset.value.x - _scroll.value.x,
      y: _offset.value.y - _scroll.value.y,
    };
  });

  const applyConfig = (config: Partial<Konva.StageConfig>) => {
    Object.assign(_stage.value, config);
  };

  return {
    _stageNode,
    _stage,
    _offset,
    _scroll,
    stage,
    fieldWidth,
    fieldHeight,
    fieldPadding,
    stageConfig,
    applyConfig,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasStageStore, import.meta.hot));
}
