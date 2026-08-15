<script setup lang="ts">
import { CanvasLayersElement, CanvasLayersGroup } from '#components';
import { type LayerGroup, type LayerItem, type SceneElement, type SelectionGroup, SelectionGroupIcons, SelectionGroupNames, SelectionGroups } from '~/models/types';

const layersStore = useLayersStore();
const asLayerGroup = (layer: LayerItem<SceneElement | LayerGroup>) => layer as LayerItem<LayerGroup>;
const asSceneElement = (layer: LayerItem<SceneElement | LayerGroup>) => layer as LayerItem<SceneElement>;
</script>

<template>
  <div class="layers-container">
    <div class="layers-controls mb flex">
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
          @click="layersStore.toggleGroup(Number(group) as SelectionGroup)"
        />
      </va-button-group>

      <va-spacer />

      <va-button
        preset="primary"
        :color="layersStore.hideHiddenElements ? 'primary' : 'primary-dark'"
        :class="layersStore.hideHiddenElements ? 'a-pulse' : ''"
        icon="disabled_visible"
        title="Toggle hidden elements"
        @click="layersStore.toggleHiddenElements"
      />
    </div>

    <va-list class="layers-list">
      <template v-for="layer in layersStore.layers" :key="layer.id">
        <CanvasLayersGroup
          v-if="layer.type === 'group'"
          :item="asLayerGroup(layer)"
        />
        <CanvasLayersElement
          v-else
          :item="asSceneElement(layer)"
        />
      </template>
    </va-list>
  </div>
</template>

<style scoped lang="scss">

</style>
