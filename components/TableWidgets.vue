<script setup lang="ts">
import type { DynamicPanelModelType } from '~/models/types';

const props = defineProps<{
  type: DynamicPanelModelType
}>();

const tableStore = useTableStore();

const toggleState = (value: boolean) => {
  tableStore.togglePanelsState({
    [props.type]: value,
  });
};
</script>

<template>
  <div v-if="tableStore.table" class="widgets-container">
    <va-card
      v-if="tableStore.mode === TableModes.OWN"
      outlined
      class="panel-state-controls"
    >
      <va-card-content class="flex gap-05">
        <va-switch
          :model-value="tableStore.table.panels[type] ?? false"
          label="Visible"
          color="primary"
          size="small"
          @update:model-value="toggleState"
        />
      </va-card-content>
    </va-card>
  </div>
</template>

<style scoped lang="scss">
.panel-state-controls {
  --va-card-padding: 0.5rem;
}
</style>
