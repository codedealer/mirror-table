<script setup lang="ts">
import { useElementHover } from '@vueuse/core';
import type { HoverPanelContentType } from '~/models/types';
import { HoverPanelContentTypes, HoverPanelModes } from '~/models/types';
import { HoverPanelPresentationMode, SessionControlPanel } from '#components';

const panel = ref();
const hoverPanelStore = useHoverPanelStore();

const isHovered = useElementHover(panel, {
  delayEnter: 200,
  delayLeave: 400,
});

const availableComponents: Record<HoverPanelContentType, unknown> = {
  [HoverPanelContentTypes.SESSION_CONTROL]: SessionControlPanel,
  [HoverPanelContentTypes.PRESENTATION_CONTROL]: HoverPanelPresentationMode,
};

const isActive = computed(() => {
  if (hoverPanelStore.mode === HoverPanelModes.MANUAL) {
    return true;
  }

  return hoverPanelStore.isInteractive && isHovered.value;
});

const translateVar = computed(() => {
  return `--translate: ${isActive.value ? '0' : '1'}`;
});
</script>

<template>
  <div class="ghost-container">
    <div
      v-show="!hoverPanelStore.disabled"
      ref="panel"
      :class="{ active: isActive }"
      :style="translateVar"
      class="interaction-area"
    >
      <component
        :is="availableComponents[hoverPanelStore.content]"
        class="hover-panel"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
