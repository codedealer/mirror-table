<script setup lang="ts">
import type { DynamicPanelModelType, Widget } from '~/models/types';
import { DataRetrievalStrategies, DynamicPanelModelTypes, isGapiErrorResponseResult, isObject, TableModes } from '~/models/types';

const props = defineProps<{
  panel: DynamicPanelModelType;
  widget: Widget;
}>();
const tableStore = useTableStore();
const widgetStore = useWidgetStore();
const showControls = computed(() => tableStore.mode === TableModes.OWN);
const isTrashed = computed(() => !!props.widget.trashed);

const toggleEnabled = () => {
  if (!props.widget.id) {
    return;
  }

  if (isTrashed.value) {
    return;
  }

  widgetStore.updateWidget(props.widget.id, {
    enabled: !props.widget.enabled,
  });
};
const isDriveNotFoundError = (e: unknown) => {
  if (!isObject(e)) {
    return false;
  }

  if (isGapiErrorResponseResult(e)) {
    return e.error.code === 404;
  }

  if ('result' in e && isObject(e.result) && isGapiErrorResponseResult(e.result)) {
    return e.result.error.code === 404;
  }

  return false;
};

const edit = async () => {
  if (!props.widget.fileId) {
    const notification = useNotificationStore();
    notification.error('Corresponding widget file not found');
    return;
  }

  // This is the point where we verify the Drive file.
  // - If it exists but is trashed: open window in trashed mode (restore-only).
  // - If it is truly gone (404): remove Firestore references and notify.
  try {
    const driveFileStore = useDriveFileStore();
    const { error } = await driveFileStore.getFile(
      props.widget.fileId,
      DataRetrievalStrategies.SOURCE,
    );

    if (error) {
      throw error;
    }
  } catch (e) {
    if (isDriveNotFoundError(e)) {
      const notification = useNotificationStore();
      notification.error('This widget was permanently deleted from Drive. Removing it from the table.');

      Object.values(DynamicPanelModelTypes).forEach((panel) => {
        void tableStore.removeWidgetFromPanel(panel, props.widget.id);
      });
      void widgetStore.removeWidget(props.widget.id);

      return;
    }

    const notification = useNotificationStore();
    notification.error(extractErrorMessage(e));
    console.error(e);
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
  <va-card-block class="widget-controls">
    <div v-if="showControls" class="ghost-container">
      <va-card-content class="flex justify-end gap-05">
        <va-badge
          v-show="!props.widget.enabled"
          text="Hidden"
          color="warning"
        />

        <va-badge
          v-show="isTrashed"
          text="Deleted"
          color="danger"
        />

        <va-button
          icon="visibility"
          preset="plain"
          :color="widget.enabled ? 'primary' : 'background-border'"
          :disabled="isTrashed"
          @click="toggleEnabled"
        />
        <va-button
          :icon="isTrashed ? 'open_in_new' : 'edit'"
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
    </div>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
