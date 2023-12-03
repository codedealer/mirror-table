<script setup lang="ts">
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';
import { updateFile } from '~/utils/driveOps';

const props = defineProps<{
  window: ModalWindow
}>();

const editor = ref();

const contentData = computed(() =>
  (props.window.content as ModalWindowContentMarkdown).data,
);

const isLoading = computed(() => props.window.status === ModalWindowStatus.LOADING);

const windowStore = useWindowStore();

const setDirty = () => {
  if (props.window.status === ModalWindowStatus.LOADING ||
      props.window.status === ModalWindowStatus.DIRTY) {
    return;
  }

  windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
};

const submit = async () => {
  const driveTreeStore = useDriveTreeStore();
  if (props.window.node) {
    driveTreeStore.setNodeLoading(props.window.node, true);
  }

  try {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);

    // should be moved to a markdown content store?
    const file = new File(
      [contentData.value.body],
      contentData.value.meta.name,
      {
        type: 'text/markdown',
      },
    );

    if (!contentData.value.meta.parents) {
      throw new Error('No parent folder found');
    }

    await updateFile(
      contentData.value.meta.id,
      file,
      contentData.value.meta.appProperties,
    );

    // update the modified time
    contentData.value.meta.modifiedTime = (new Date()).toISOString();
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  } finally {
    if (props.window.node) {
      driveTreeStore.setNodeLoading(props.window.node, false);
    }
  }
};
</script>

<template>
  <div class="markdown-form-container">
    <va-form
      tag="form"
      class="vertical-form markdown-form"
      @submit.prevent="submit"
    >
      <va-input
        v-model="contentData.meta.name"
        name="title"
        label="Title"
        :min-length="1"
        :max-length="180"
        required
        :disabled="isLoading"
        @update:dirty="setDirty"
      />

      <va-textarea
        ref="editor"
        v-model="contentData.body"
        name="content"
        class="markdown-editor"
        placeholder="Enter markdown here"
        :min-rows="5"
        :disabled="isLoading"
        @update:dirty="setDirty"
      />

      <div class="vertical-form__actions">
        <va-button
          preset="outlined"
          type="submit"
          :disabled="window.status === ModalWindowStatus.SYNCED"
          :loading="isLoading"
        >
          Save
        </va-button>
      </div>
    </va-form>
  </div>
</template>
