<script setup lang="ts">
import { useCanvasContextPanelStore } from '~/stores/canvas-context-panel-store';
import type { ContextAction } from '~/models/types';
import ContextPanel from '~/components/ContextPanel.vue';

const store = useCanvasContextPanelStore();

const { elementId } = storeToRefs(store);

const menuOptions = ref<ContextAction[]>([]);

watchEffect(() => {
  if (!elementId.value) {
    return;
  }

  menuOptions.value = CanvasAssetContextActionsFactory(elementId.value);
});

const menuModel = ref(false);

// hide the menu when the context panel is hidden
watchEffect(() => {
  if (!store.visible) {
    menuModel.value = false;
  }
});

const styleObject = computed(() => ({
  '--top': store.position.y,
  '--left': store.position.x,
}));
</script>

<template>
  <va-card
    v-show="store.visible"
    :style="styleObject"
    class="canvas-context-panel"
  >
    <va-card-content>
      <ContextPanel
        v-model:dropdown="menuModel"
        :actions="menuOptions"
        preset=""
        size="small"
      />
    </va-card-content>
  </va-card>
</template>

<style scoped lang="scss">
</style>
