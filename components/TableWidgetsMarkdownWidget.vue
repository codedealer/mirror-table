<script setup lang="ts">
import type { DynamicPanelModelType, WidgetMarkdown } from '~/models/types';

const props = defineProps<{
  panel: DynamicPanelModelType
  widget: WidgetMarkdown
}>();

const tableStore = useTableStore();
const widgetStore = useWidgetStore();

const showControls = computed(() => tableStore.mode === TableModes.OWN);

const toggleEnabled = () => {
  if (!props.widget.id) {
    return;
  }

  widgetStore.updateWidget(props.widget.id, {
    enabled: !props.widget.enabled,
  });
};
const edit = () => {
  if (!props.widget.fileId) {
    const notification = useNotificationStore();
    notification.error('Corresponding widget file not found');
    return;
  }

  // open a window for the given file id
  const window = WindowFactory(
    props.widget.fileId,
    'Edit widget',
    {
      type: 'widget',
      editing: true,
    },
  );

  const windowStore = useWindowStore();
  windowStore.toggleOrAdd(window, true);
};
const remove = () => {
  tableStore.removeWidgetFromPanel(props.panel, props.widget.id);
};
</script>

<template>
  <va-card outlined class="card-thin">
    <va-card-block v-if="showControls">
      <va-card-content class="flex justify-end gap-05">
        <va-button
          icon="visibility"
          preset="plain"
          :color="widget.enabled ? 'primary' : 'background-border'"
          @click="toggleEnabled"
        />
        <va-button
          icon="edit"
          preset="plain"
          color="primary"
          @click="edit"
        />
        <va-button
          icon="close"
          preset="plain"
          color="primary"
          @click="remove"
        />
      </va-card-content>
    </va-card-block>
    <va-card-block>
      <va-card-content>
        <MarkdownRenderer :source="widget.content" />
      </va-card-content>
    </va-card-block>
  </va-card>
</template>

<style scoped lang="scss">

</style>
