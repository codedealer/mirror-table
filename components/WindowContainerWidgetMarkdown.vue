<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import type { DriveWidget, ModalWindow, WidgetMarkdown, WidgetProperties } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';

const props = defineProps<{
  window: ModalWindow
  file?: DriveWidget
}>();

const windowStore = useWindowStore();
const widgetStore = useWidgetStore();

const widget = ref<WidgetMarkdown | undefined>();

watch(() => props.file, async (file) => {
  if (!file || !file.appProperties.firestoreId) {
    return;
  }

  widget.value = await widgetStore.getWidget<WidgetMarkdown>(file.appProperties.firestoreId);
});

const value = ref('');

watchEffect(() => {
  if (!widget.value) {
    return;
  }

  value.value = widget.value.content;
});

const checkDirty = () => {
  if (widget.value?.content !== value.value) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
  } else {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  }
};

watch(value, useDebounceFn(checkDirty, 1000));

const windowForm = ref();

const create = async (file: DriveWidget) => {
  const payload: WidgetMarkdown = {
    id: '', // will be filled on creation
    owner: '', // will be filled on creation
    enabled: true,
    template: file.appProperties.template,
    rank: Date.now(),
    content: value.value,
  };

  const widget = await widgetStore.createWidget(payload);

  if (!widget) {
    throw new Error('Failed to create widget');
  }

  // update the file with the widget id
  const appProperties: WidgetProperties = {
    ...file.appProperties,
    firestoreId: widget.id,
  };

  const driveFileStore = useDriveFileStore();
  await driveFileStore.saveFile(
    file.id,
    appProperties,
    file.name,
  );
};

const submit = async () => {
  if (!props.file || !value.value.length) {
    return;
  }

  checkDirty();
  if (props.window.status !== ModalWindowStatus.DIRTY) {
    return;
  }

  try {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);

    if (!props.file.appProperties.firestoreId) {
      await create(props.file);
    } else {
      throw new Error('Not implemented');
    }

    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  }
};
</script>

<template>
  <div class="window-container-markdown__content">
    <va-inner-loading
      :loading="window.status === ModalWindowStatus.LOADING"
    >
      <va-form
        ref="windowForm"
        tag="form"
        class="vertical-form markdown-form"
        @submit.prevent="submit"
      >
        <div class="horizontal-control">
          <va-textarea
            v-model="value"
            name="content"
            label="Content"
            required
            class="markdown-editor"
            placeholder="Enter markdown here"
            resize
            :min-rows="5"
            :max-rows="25"
          />
        </div>

        <div class="vertical-form__actions">
          <va-button
            preset="outlined"
            type="submit"
            :disabled="window.status === ModalWindowStatus.SYNCED || !value.length"
          >
            Save
          </va-button>
        </div>
      </va-form>
    </va-inner-loading>
  </div>
</template>

<style scoped lang="scss">

</style>
