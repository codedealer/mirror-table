<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';

const layersStore = useLayersStore();
const hotkeyStore = useHotkeyStore();
const hoverPanelStore = useHoverPanelStore();

watchEffect(() => {
  if (layersStore.hideHiddenElements) {
    hoverPanelStore.requestManual('hidden-elements');
  } else {
    hoverPanelStore.dismissManual('hidden-elements');
  }
});

onUnmounted(() => {
  hoverPanelStore.dismissManual('hidden-elements');
});

hotkeyStore.registerHotkey({
  id: 'toggle-hidden-elements',
  key: 'H',
  modifiers: {},
  description: 'Toggle hidden elements',
  namespace: 'Canvas',
});
onKeyStroke(true, (e) => {
  if (
    e.code !== 'KeyH' ||
    e.shiftKey ||
    e.ctrlKey ||
    e.altKey ||
    e.metaKey ||
    (e.target && isEditableElement(e.target))
  ) {
    return;
  }

  e.preventDefault();
  layersStore.toggleHiddenElements();
});
</script>

<template>
  <va-card-block
    horizontal
  >
    <va-card-content class="flex gap-05">
      <va-popover
        message="Toggle hidden elements (H)"
      >
        <va-button
          preset="primary"
          :color="layersStore.hideHiddenElements ? 'primary' : 'primary-dark'"
          :class="layersStore.hideHiddenElements ? 'a-pulse' : ''"
          icon="disabled_visible"
          title="Toggle hidden elements"
          @click="layersStore.toggleHiddenElements"
        />
      </va-popover>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
