<script setup lang="ts">
import type Konva from 'konva';
import type { KonvaComponent } from '~/models/types';

const stage = ref<KonvaComponent<Konva.Node> | null>(null);

const canvasStageStore = useCanvasStageStore();
const canvasElementsStore = useCanvasElementsStore();

onMounted(() => {
  canvasStageStore._stageNode = stage.value;
});

const onNodeTransformEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  const node = e.target as Konva.Node;
  const id = node.id();

  const transforms = {
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
    rotation: node.rotation(),
  };

  if (id === '_stage') {
    canvasStageStore._offset = {
      x: node.x() + canvasStageStore._scroll.x,
      y: node.y() + canvasStageStore._scroll.y,
    };

    canvasStageStore.applyConfig(transforms);
  } else {
    throw new Error('not implemented');
  }
};
</script>

<template>
  <v-stage
    id="_stage"
    ref="stage"
    :config="canvasStageStore.stageConfig"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
  >
    <v-layer>
      <TheSceneCanvasAsset
        v-for="asset in canvasElementsStore.canvasElements"
        :key="asset.id"
        :element="asset"
      />
    </v-layer>
  </v-stage>
</template>

<style scoped lang="scss">

</style>
