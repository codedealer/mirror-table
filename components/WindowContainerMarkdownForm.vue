<script setup lang="ts">
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';
import { updateFile } from '~/utils/driveOps';

const props = defineProps<{
  window: ModalWindow
}>();

const contentData = computed(() =>
  (props.window.content as ModalWindowContentMarkdown).data,
);

const isLoading = computed(() => props.window.status === ModalWindowStatus.LOADING);

const submit = async () => {
  const windowStore = useWindowStore();
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

    const response = await updateFile(
      contentData.value.meta.id,
      file,
      contentData.value.meta.appProperties,
    );

    console.log('updated: ', response);
    // update the modified time
    contentData.value.meta.modifiedTime = (new Date()).toISOString();
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
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
      />

      <va-textarea
        v-model="contentData.body"
        name="content"
        placeholder="Enter markdown here"
        :disabled="!props.window.content.editing"
      />

      <div class="vertical-form__actions">
        <va-button
          preset="outlined"
          type="submit"
          :loading="isLoading"
        >
          Save
        </va-button>
      </div>
    </va-form>
  </div>
</template>
