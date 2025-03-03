<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { useCanvasContextPanelStore } from '~/stores/canvas-context-panel-store';
import type { ContextAction } from '~/models/types';
import ContextPanel from '~/components/ContextPanel.vue';

const store = useCanvasContextPanelStore();
const canvasStageStore = useCanvasStageStore();

const { elementId } = storeToRefs(store);

const menuOptions = ref<ContextAction[]>([]);

watchEffect(() => {
  if (!elementId.value) {
    store.visible = false;
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

const card = ref();
const { width: elementWidth } = useElementSize(card);

const styleObject = computed(() => {
  const canvasWidth = (canvasStageStore._stage?.width ?? 0) - canvasStageStore.fieldPadding * 2;
  let x = store.position.x;

  if (store.position.x + elementWidth.value > canvasWidth) {
    x = canvasWidth - elementWidth.value;
  }

  const style = {
    '--top': store.position.y,
    '--left': x,
  };

  return style;
});
</script>

<template>
  <div
    ref="card"
    :style="styleObject"
    class="canvas-context-panel"
  >
    <va-card
      v-show="store.visible"
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
  </div>
</template>

<style scoped lang="scss">
</style>
