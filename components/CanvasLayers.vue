<script setup lang="ts">
import { CanvasLayersElement, CanvasLayersGroup } from '#components';

const layersStore = useLayersStore();
</script>

<template>
  <va-list class="layers-list">
    <template v-for="layer in layersStore.layers" :key="layer.id">
      <component
        :is="layer.type === 'group' ? CanvasLayersGroup : CanvasLayersElement "
        :item="layer"
      />
    </template>
  </va-list>
</template>

<style scoped lang="scss">

</style>
