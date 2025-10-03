<script setup lang="ts">
import type { LayerGroup, LayerItem } from '~/models/types';

defineProps<{
  item: LayerItem<LayerGroup>;
}>();
</script>

<template>
  <va-list-item class="layer-group">
    <va-list-item-section>
      <va-list-item-label>
        {{ item.item.name }}

        <va-icon
          v-show="item.item.icon"
          :name="item.item.icon"
          size="small"
          class="ml-2"
        />
      </va-list-item-label>
    </va-list-item-section>
  </va-list-item>
</template>

<style scoped lang="scss">

</style>
