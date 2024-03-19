<script setup lang="ts">
import type { DynamicPanelModelType, WidgetTemplate } from '~/models/types';
import TableWidgetsMarkdownWidget from '~/components/TableWidgetsMarkdownWidget.vue';

const props = defineProps<{
  type: DynamicPanelModelType
}>();

const tableStore = useTableStore();

const toggleState = (value: boolean) => {
  tableStore.togglePanelsState({
    [props.type]: value,
  });
};

const widgetComponents: Record<WidgetTemplate, unknown> = {
  [WidgetTemplates.MARKDOWN]: TableWidgetsMarkdownWidget,
};

const widgetStore = useWidgetStore();
</script>

<template>
  <div v-if="tableStore.table" class="widgets-container">
    <va-card
      v-if="tableStore.mode === TableModes.OWN"
      outlined
      class="card-thin mb"
    >
      <va-card-content class="flex gap-05">
        <va-switch
          :model-value="tableStore.table.panels[type] ?? false"
          label="Show to others"
          color="primary"
          size="small"
          @update:model-value="toggleState"
        />
      </va-card-content>
    </va-card>

    <template v-for="widgetId in tableStore.table.widgets[type]">
      <component
        :is="widgetComponents[widgetStore.widgetMap.get(widgetId)!.template]"
        v-if="widgetStore.widgetMap.has(widgetId)"
        :key="widgetId"
        :panel="type"
        :widget="widgetStore.widgetMap.get(widgetId)"
        class="widget"
      />
      <TableWidgetsUnavailableWidget
        v-else
        :id="widgetId"
        :key="`${widgetId}-unavailable`"
        :panel="type"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
</style>
