<script setup lang="ts">
import { onKeyStroke, useFullscreen } from '@vueuse/core';

const { isFullscreen, toggle, isSupported } = useFullscreen();

onKeyStroke(true, (e) => {
  if (!e.target || isEditableElement(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || !isSupported.value) {
    return;
  }

  if (e.code === 'F11') {
    toggle();
  }
});

const hotkeyStore = useHotkeyStore();

hotkeyStore.registerHotkey({
  id: 'toggle-fullscreen',
  description: 'Toggle Fullscreen mode',
  key: 'F11',
  modifiers: { },
  namespace: 'General',
});
</script>

<template>
  <va-card-block v-show="isSupported" horizontal>
    <va-divider vertical />
    <va-card-content class="flex gap-05">
      <va-popover :hover-over-timeout="1000" message="Toggle Fullscreen mode">
        <va-button
          preset="primary"
          :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          @click="toggle"
        />
      </va-popover>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
