<script setup lang="ts">
import type { DynamicPanelModelType } from '~/models/types';

const props = defineProps<{
  type: DynamicPanelModelType
}>();

const tableStore = useTableStore();

const isActive = computed(() => {
  return tableStore.table?.panels[props.type] ?? false;
});

const classList = computed(() => {
  return {
    active: isActive.value,
    [props.type]: true,
  };
});
</script>

<template>
  <div
    class="dynamic-panel-icon"
    :class="classList"
  />
</template>

<style lang="scss">
.dynamic-panel-icon {
  --border-radius: 3px;
  width: 8px;
  height: 18px;
  border: 2px solid currentColor;
  border-radius: var(--border-radius);
  background-color: transparent;
  transition: background-color 0.2s;

  &.active {
    background-color: currentColor;
  }

  & + .dynamic-panel-icon {
    margin-left: 3px;
  }
}
</style>
