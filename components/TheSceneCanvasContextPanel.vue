<script setup lang="ts">
import type { ContextAction } from '~/models/types';
import { useElementSize } from '@vueuse/core';
import ContextPanel from '~/components/ContextPanel.vue';
import { useCanvasContextPanelStore } from '~/stores/canvas-context-panel-store';

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

const onPanelLeave = () => {
  // Don't hide if dropdown menu is open - user might be hovering over it
  if (menuModel.value) {
    return;
  }
  store.hide();
};
</script>

<template>
  <div
    ref="card"
    :style="styleObject"
    class="canvas-context-panel"
    @mouseleave="onPanelLeave"
  >
    <va-card
      v-show="store.visible"
      class="canvas-context-panel__card"
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
