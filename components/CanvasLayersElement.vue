<script setup lang="ts">
import type { LayerItem, SceneElement, SceneElementCanvasObjectAsset, SceneElementScreen } from '~/models/types';
import CanvasLayersElementAsset from '~/components/CanvasLayersElementAsset.vue';

defineProps<{
  item: LayerItem<SceneElement>
}>();
</script>

<template>
  <div class="ghost-container">
    <CanvasLayersElementAsset
      v-if="isSceneElementCanvasObject(item.item) && isSceneElementCanvasObjectAsset(item.item)"
      :item="item as LayerItem<SceneElementCanvasObjectAsset>"
    />
    <CanvasLayersElementScreen
      v-else-if="isSceneElementScreen(item.item)"
      :item="item as LayerItem<SceneElementScreen>"
    />
    <va-list-item v-else>
      <va-list-item-section>
        <va-list-item-label>
          Unrecognized element
        </va-list-item-label>
      </va-list-item-section>
    </va-list-item>
  </div>
</template>

<style scoped lang="scss">

</style>
