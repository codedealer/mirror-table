<script setup lang="ts">
import TheSceneScreenElement from '~/components/TheSceneScreenElement.vue';

const canvasElementsStore = useCanvasElementsStore();
</script>

<template>
  <div
    v-show="canvasElementsStore.screenElements.length > 0"
    class="title-screen-container"
  >
    <TheSceneScreenElement
      v-for="element in canvasElementsStore.screenElements"
      :key="element.id"
      :item="element"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
