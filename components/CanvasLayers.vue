<script setup lang="ts">
import { CanvasLayersElement, CanvasLayersGroup } from '#components';

const layersStore = useLayersStore();
</script>

<template>
  <div class="layers-container">
    <div class="layers-controls mb">
      <va-button-group
        preset="primary"
      >
        <va-button
          v-for="(groupIcon, group) in SelectionGroupIcons"
          :key="groupIcon"
          :icon="groupIcon"
          :color="layersStore.activeGroups[group] ? 'primary' : 'primary-dark'"
          :disabled="Number(group) === SelectionGroups.SCREEN"
          :title="`Toggle ${SelectionGroupNames[group]} layer`"
          @click="layersStore.toggleGroup(group)"
        />
      </va-button-group>
    </div>

    <va-list class="layers-list">
      <template v-for="layer in layersStore.layers" :key="layer.id">
        <component
          :is="layer.type === 'group' ? CanvasLayersGroup : CanvasLayersElement "
          :item="layer"
        />
      </template>
    </va-list>
  </div>
</template>

<style scoped lang="scss">

</style>
