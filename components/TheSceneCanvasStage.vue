<script setup lang="ts">
import type Konva from 'konva';
import { onKeyDown, onKeyUp } from '@vueuse/core';
import type { IKonvaComponent } from '~/models/types';

const stage = ref<IKonvaComponent<Konva.Node> | null>(null);

const canvasStageStore = useCanvasStageStore();

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

const startStageDrag = () => {
  console.log('startStageDrag');
  canvasStageStore.applyConfig({ draggable: true });
};

const stopStageDrag = () => {
  console.log('stopStageDrag');
  canvasStageStore.applyConfig({ draggable: false });
};

onKeyDown(' ', (e) => {
  e.preventDefault();
  canvasStageStore.applyConfig({ draggable: true });
}, { dedupe: true });

onKeyUp(' ', (e) => {
  e.preventDefault();
  canvasStageStore.applyConfig({ draggable: false });
});

const configCircle = ref({
  x: 100,
  y: 100,
  radius: 50,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 4,
});
</script>

<template>
  <v-stage
    id="_stage"
    ref="stage"
    :config="canvasStageStore._stage"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
    @scroll="startStageDrag"
    @scrollend="stopStageDrag"
  >
    <v-layer>
      <v-circle :config="configCircle" />
    </v-layer>
  </v-stage>
</template>

<style scoped lang="scss">

</style>
