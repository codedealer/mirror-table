<script setup lang="ts">
import { onKeyStroke, useElementSize } from '@vueuse/core';
import { useWindowStore } from '~/stores/window-store';
import TheWindowManagerTab from '~/components/TheWindowManagerTab.vue';
import { calculateNumberOfElements, isEditableElement } from '~/utils';

const container = ref(null);
const minElWidth = 90;
const { width } = useElementSize(container);
const windowStore = useWindowStore();

watchEffect(() => {
  windowStore.maxWindows = calculateNumberOfElements(width.value, minElWidth);
});

onKeyStroke(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], (e) => {
  if (e.target && isEditableElement(e.target)) {
    return;
  }

  const index = Number(e.key);
  if (!Number.isFinite(index)) {
    return;
  }

  const window = windowStore.windows[index === 0 ? 9 : index - 1];
  if (window) {
    windowStore.toggle(window);
  }
}, {
  dedupe: true,
});
</script>

<template>
  <div ref="container" class="window-manager">
    <transition-group name="h-list">
      <TheWindowManagerTab
        v-for="(window, index) in windowStore.windows"
        :key="window.id"
        :window="window"
        :index="index + 1"
      />
    </transition-group>
  </div>
</template>

<style scoped lang="scss">

</style>
