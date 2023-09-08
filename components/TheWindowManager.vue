<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { useWindowStore } from '~/stores/window-store';
import TheWindowManagerTab from '~/components/TheWindowManagerTab.vue';
import { calculateNumberOfElements } from '~/utils';

const container = ref(null);
const minElWidth = 90;
const { width } = useElementSize(container);
const windowStore = useWindowStore();

watchEffect(() => {
  windowStore.maxWindows = calculateNumberOfElements(width.value, minElWidth);
});
</script>

<template>
  <div ref="container" class="window-manager">
    <transition-group name="h-list">
      <TheWindowManagerTab
        v-for="window in windowStore.windows"
        :key="window.id"
        :window="window"
      />
    </transition-group>
  </div>
</template>

<style scoped lang="scss">

</style>
