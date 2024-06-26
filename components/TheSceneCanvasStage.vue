<script setup lang="ts">
import type Konva from 'konva';
import type { KonvaComponent } from '~/models/types';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';

const stage = ref<KonvaComponent<Konva.Node> | null>(null);
const imageTransformer = ref<KonvaComponent<Konva.Transformer> | null>(null);
const selectionRect = ref<KonvaComponent<Konva.Rect> | null>(null);

const canvasStageStore = useCanvasStageStore();
const canvasElementsStore = useCanvasElementsStore();

onMounted(() => {
  canvasStageStore._stageNode = stage.value;
  canvasStageStore._imageTransformerNode = imageTransformer.value;
  canvasStageStore._selectionRectNode = selectionRect.value;
});

const { onNodeTransformEnd, onKonvaEvent } = useCanvasTransformEvents();

const imageTransformerConfig = ref<Konva.TransformerConfig>({
  flipEnabled: false,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  boundBoxFunc: (oldBox, newBox) => {
    // limit resize
    if (newBox.width < 32 || newBox.height < 32) {
      return oldBox;
    }
    return newBox;
  },
});
</script>

<template>
  <v-stage
    id="_stage"
    ref="stage"
    :config="canvasStageStore.stageConfig"
    @pointerdown="onKonvaEvent"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
  >
    <v-layer>
      <TheSceneCanvasAsset
        v-for="asset in canvasElementsStore.canvasElements"
        :key="asset.id"
        :element="asset"
      />

      <v-transformer
        ref="imageTransformer"
        :config="imageTransformerConfig"
      />
      <v-rect ref="selectionRect" :config="{ visible: false }" />
    </v-layer>
  </v-stage>
</template>

<style scoped lang="scss">

</style>
