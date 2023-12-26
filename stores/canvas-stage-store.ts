import type Konva from 'konva';
import type { ElementContainerConfig, KonvaComponent } from '~/models/types';

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

  const fitToStage = (container: ElementContainerConfig) => {
    if (
      !stageConfig.value ||
      !stageConfig.value.width ||
      !stageConfig.value.height ||
      container.width <= 0 ||
      container.height <= 0
    ) {
      return container;
    }

    const realStageWidth = stageConfig.value.width * stageConfig.value.scaleX! - fieldPadding.value * 2;
    const realStageHeight = stageConfig.value.height * stageConfig.value.scaleY! - fieldPadding.value * 2;

    const stageCenter = {
      x: -stageConfig.value.x + fieldPadding.value + realStageWidth / 2,
      y: -stageConfig.value.y + fieldPadding.value + realStageHeight / 2,
    };

    // place the container in the center of the stage
    // scale it down if it's too big
    const scale = Math.min(
      realStageWidth / container.width,
      realStageHeight / container.height,
      1,
    );

    const scaledContainer = {
      ...container,
      scaleX: scale,
      scaleY: scale,
      x: stageCenter.x - (container.width * scale) / 2,
      y: stageCenter.y - (container.height * scale) / 2,
    } satisfies ElementContainerConfig;

    return scaledContainer;
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
    fitToStage,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasStageStore, import.meta.hot));
}
