import type Konva from 'konva';
import type { ElementContainerConfig, KonvaComponent } from '~/models/types';
import type { WithIdPlaceholders } from '~/utils/replaceIdPlaceholder';

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

  const _imageTransformerNode = ref<
    KonvaComponent<Konva.Transformer> | null
  >(null);
  const imageTransformer = computed(() => _imageTransformerNode.value?.getNode());

  const _selectionRectNode = ref<
    KonvaComponent<Konva.Rect> | null
  >(null);
  const selectionRect = computed(() => _selectionRectNode.value?.getNode());

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

  const fitToStage = <T extends ElementContainerConfig>(container: WithIdPlaceholders<T> | T): T => {
    if (
      !stageConfig.value
      || !stageConfig.value.width
      || !stageConfig.value.height
      || typeof container.width !== 'number'
      || container.width <= 0
      || typeof container.height !== 'number'
      || container.height <= 0
    ) {
      return container as T;
    }

    const labelPadding = 100;

    const realStageWidth = stageConfig.value.width * stageConfig.value.scaleX! - fieldPadding.value * 2;
    const realStageHeight = stageConfig.value.height * stageConfig.value.scaleY! - fieldPadding.value * 2;

    const stageCenter = {
      x: -stageConfig.value.x + fieldPadding.value + realStageWidth / 2,
      y: -stageConfig.value.y + fieldPadding.value + realStageHeight / 2,
    };

    // Get the existing scale (from stored asset transforms)
    const existingScaleX = container.scaleX ?? 1;
    const existingScaleY = container.scaleY ?? 1;

    // Calculate the visual size with existing scale
    const visualWidth = container.width * existingScaleX;
    const visualHeight = container.height * existingScaleY;

    // Calculate fit scale based on visual size
    // scale it down if it's too big
    const fitScale = Math.min(
      realStageWidth / visualWidth,
      realStageHeight / (visualHeight + labelPadding * existingScaleY),
      1,
    );

    // Combine existing scale with fit scale
    const finalScaleX = existingScaleX * fitScale;
    const finalScaleY = existingScaleY * fitScale;

    // Calculate position based on final visual size
    const finalVisualWidth = container.width * finalScaleX;
    const finalVisualHeight = container.height * finalScaleY;

    const scaledContainer = {
      ...container,
      scaleX: finalScaleX,
      scaleY: finalScaleY,
      x: stageCenter.x - finalVisualWidth / 2,
      y: stageCenter.y - (finalVisualHeight + labelPadding * finalScaleY) / 2,
    } as T;

    return scaledContainer;
  };

  /**
   * Convert browser coordinates (from drop event) to stage coordinates,
   * accounting for scroll offset, stage transform, and scale.
   * Clamps the position to keep the full asset within canvas bounds.
   *
   * @param clientX Browser x coordinate
   * @param clientY Browser y coordinate
   * @param assetWidth Asset width (unscaled)
   * @param assetHeight Asset height (unscaled)
   * @param assetScaleX Asset scale X (default 1)
   * @param assetScaleY Asset scale Y (default 1)
   * @returns Stage coordinates (x, y) or null if stage not available
   */
  const browserCoordsToStageCoords = (
    clientX: number,
    clientY: number,
    assetWidth: number,
    assetHeight: number,
    assetScaleX: number = 1,
    assetScaleY: number = 1,
  ): { x: number; y: number } | null => {
    if (!stage.value) {
      return null;
    }

    // Sync Konva pointer state with the browser drop event coordinates.
    stage.value.setPointersPositions({ clientX, clientY });

    // Use getRelativePointerPosition which accounts for stage transform
    const relativePos = stage.value.getRelativePointerPosition();
    if (!relativePos) {
      return null;
    }

    // Calculate visual dimensions with scale
    const visualWidth = assetWidth * assetScaleX;
    const visualHeight = assetHeight * assetScaleY;

    // Calculate field bounds (stage has field padding)
    const minX = 0;
    const minY = 0;
    const maxX = fieldWidth.value;
    const maxY = fieldHeight.value;

    // Clamp position so asset stays fully within bounds
    // Position is the center of the asset, so we need to account for half the visual size
    let x = relativePos.x;
    let y = relativePos.y;

    // Clamp to keep full asset in bounds
    x = Math.max(minX + visualWidth / 2, Math.min(maxX - visualWidth / 2, x));
    y = Math.max(minY + visualHeight / 2, Math.min(maxY - visualHeight / 2, y));

    return { x, y };
  };

  return {
    _stageNode,
    _stage,
    _imageTransformerNode,
    _selectionRectNode,
    _offset,
    _scroll,
    stage,
    imageTransformer,
    selectionRect,
    fieldWidth,
    fieldHeight,
    fieldPadding,
    stageConfig,
    applyConfig,
    fitToStage,
    browserCoordsToStageCoords,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasStageStore, import.meta.hot));
}
