<script setup lang="ts">
import type { ComputedRef } from 'vue';
import type Konva from 'konva';
import type {
  CanvasElementStateLoadable,
  SceneElementCanvasObjectAsset,
  Stateful,
} from '~/models/types';

import { useCanvasAsset } from '~/composables/useCanvasAsset';

const props = defineProps<{
  element: Stateful<SceneElementCanvasObjectAsset, CanvasElementStateLoadable>
}>();

const { error, asset, image } = useCanvasAsset(toRef(() => props.element));

const imageConfig: ComputedRef<Konva.ImageConfig | null> = computed(() => {
  if (!image.value) {
    return null;
  }

  return {
    image: image.value,
  };
});

const circleConfig = ref({
  x: 100,
  y: 100,
  radius: 50,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 4,
});
</script>

<template>
  <v-group :config="element.container">
    <v-circle v-if="!imageConfig" :config="circleConfig" />
    <v-image v-else :config="imageConfig" />
  </v-group>
</template>

<style scoped lang="scss">

</style>
