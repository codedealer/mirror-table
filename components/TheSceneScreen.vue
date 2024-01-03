<script setup lang="ts">
import TheSceneScreenElement from '~/components/TheSceneScreenElement.vue';

const canvasElementsStore = useCanvasElementsStore();
</script>

<template>
  <div class="title-screen-container">
    <TheSceneScreenElement
      v-for="element in canvasElementsStore.screenElements"
      :key="element.id"
      :item="element"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
