<script setup lang="ts">
import { useCanvasContextPanelStore } from '~/stores/canvas-context-panel-store';

const store = useCanvasContextPanelStore();

const styleObject = computed(() => ({
  '--top': store.position.y,
  '--left': store.position.x,
}));
</script>

<template>
  <va-card
    v-show="store.visible"
    :style="styleObject"
    class="canvas-context-panel"
  >
    <va-card-content class="flex">
      <va-button
        icon="more_vert"
        color="primary-dark"
        size="small"
      />
    </va-card-content>
  </va-card>
</template>

<style scoped lang="scss">
</style>
