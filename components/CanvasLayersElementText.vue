<script setup lang="ts">
import type { LayerItem, SceneElementCanvasObjectText } from '~/models/types';

const props = defineProps<{
  item: LayerItem<SceneElementCanvasObjectText>
}>();

const canvasElementsStore = useCanvasElementsStore();

const label = computed(() => {
  return props.item.item.text.text
    ? props.item.item.text.text.substring(0, 20)
    : '<no text>';
});

const isSelected = computed(() => {
  return canvasElementsStore.selectedElements.findIndex(e => e.id === props.item.id) !== -1;
});

const contextActions = computed(() => {
  return CanvasAssetContextActionsFactory(props.item.id);
});

const select = () => {
  canvasElementsStore.selectElement(props.item.id);
};
</script>

<template>
  <va-list-item
    :disabled="false"
    class="layer-element"
    :class="{ active: isSelected }"
    href="#"
    @click="select"
  >
    <va-list-item-section avatar>
      <va-icon
        name="text_fields"
        color="primary"
        :size="32"
      />
    </va-list-item-section>
    <va-list-item-section>
      <va-list-item-label>
        {{ label }}
      </va-list-item-label>
    </va-list-item-section>
    <va-list-item-section icon>
      <ContextPanel
        :actions="contextActions"
      />
    </va-list-item-section>
  </va-list-item>
</template>

<style scoped lang="scss">

</style>
