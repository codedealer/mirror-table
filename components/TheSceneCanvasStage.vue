<script setup lang="ts">
import type Konva from 'konva';
import { onKeyDown, onKeyUp } from '@vueuse/core';
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
    x: node.x(),
    y: node.y(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
    rotation: node.rotation(),
  };

  if (id === '_stage') {
    canvasStageStore.applyConfig(transforms);
  } else {
    throw new Error('not implemented');
  }
};

onKeyDown(' ', (e) => {
  e.preventDefault();
  if (!canvasStageStore.stage || canvasStageStore._stage.draggable) {
    return;
  }

  canvasStageStore.applyConfig({ draggable: true });
}, { dedupe: false });

onKeyUp(' ', (e) => {
  e.preventDefault();
  canvasStageStore.applyConfig({ draggable: false });
});
</script>

<template>
  <v-stage
    id="_stage"
    ref="stage"
    :config="canvasStageStore._stage"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
  >
    <v-layer>
      <TheSceneCanvasAsset
        v-for="asset in canvasElementsStore.canvasStatefulElementsRegistry"
        :key="asset.id"
        :element="asset"
      />
    </v-layer>
  </v-stage>
</template>

<style scoped lang="scss">

</style>
