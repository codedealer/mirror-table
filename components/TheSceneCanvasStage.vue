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

const dragOnWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
  // drag the stage in the direction of scrolling

};

onKeyDown(' ', (e) => {
  e.preventDefault();
  canvasStageStore.applyConfig({ draggable: true });
}, { dedupe: true });

onKeyUp(' ', (e) => {
  e.preventDefault();
  canvasStageStore.applyConfig({ draggable: false });
});

function generateNode () {
  return {
    id: Math.random().toString(),
    x: 3000 * Math.random(),
    y: 3000 * Math.random(),
    radius: 50,
    fill: 'red',
    stroke: 'black',
  };
}

const circles = ref<Konva.Circle[]>([]);

for (let i = 0; i < 100; i++) {
  circles.value.push(generateNode());
}
</script>

<template>
  <v-stage
    id="_stage"
    ref="stage"
    :config="canvasStageStore._stage"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
    @wheel="dragOnWheel"
  >
    <v-layer>
      <v-circle v-for="circle in circles" :config="circle" :key="circle.id" />
    </v-layer>
  </v-stage>
</template>

<style scoped lang="scss">

</style>
