<script setup lang="ts">
import { onKeyStroke, useFullscreen } from '@vueuse/core';
import { TableModes } from '~/models/types';

const { isFullscreen, toggle, isSupported } = useFullscreen();
const tableStore = useTableStore();
const hotkeyStore = useHotkeyStore();

const fullscreenHotkey = computed(() => {
  if (tableStore.mode === TableModes.PRESENTATION) {
    return { code: 'KeyF', key: 'F' };
  }
  if (tableStore.mode === TableModes.OWN) {
    return { code: 'F11', key: 'F11' };
  }
  return undefined;
});

watch(fullscreenHotkey, (hotkey, previousHotkey) => {
  if (previousHotkey) {
    hotkeyStore.unregisterHotkey('toggle-fullscreen');
  }
  if (hotkey) {
    hotkeyStore.registerHotkey({
      id: 'toggle-fullscreen',
      description: 'Toggle Fullscreen mode',
      key: hotkey.key,
      modifiers: {},
      namespace: 'General',
    });
  }
}, { immediate: true });

onUnmounted(() => {
  hotkeyStore.unregisterHotkey('toggle-fullscreen');
});

onKeyStroke(true, (e) => {
  if (!e.target || isEditableElement(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || !isSupported.value) {
    return;
  }

  if (fullscreenHotkey.value?.code === e.code) {
    toggle();
  }
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
