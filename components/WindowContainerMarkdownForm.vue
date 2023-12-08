<script setup lang="ts">
import { useForm } from 'vuestic-ui';
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';
import { nameValidationsRules, stripFileExtension } from '~/utils';

const props = defineProps<{
  window: ModalWindow
}>();

const editor = ref();

const contentData = computed(() =>
  (props.window.content as ModalWindowContentMarkdown).data,
);

const isLoading = computed(() => props.window.status === ModalWindowStatus.LOADING);
const title = computed(() => {
  return stripFileExtension(contentData.value.meta.name);
});

const windowStore = useWindowStore();

const updateFileName = (fileName: string) => {
  let newName = fileName;
  if (contentData.value.meta.fileExtension) {
    newName += `.${contentData.value.meta.fileExtension}`;
  }
  contentData.value.meta.name = newName;
  windowStore.setWindowTitle(props.window, fileName);

  if (props.window.node) {
    const driveTreeStore = useDriveTreeStore();
    driveTreeStore.setNodeLabel(props.window.node, fileName);
  }
};

// TODO: this
const updateShowTitle = (showTitle: boolean) => {

};

const setDirty = () => {
  if (props.window.status === ModalWindowStatus.LOADING ||
      props.window.status === ModalWindowStatus.DIRTY) {
    return;
  }

  windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
};

const windowForm = ref();
const { isValid } = useForm(windowForm);

const submit = async () => {
  if (!isValid.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error('Please fix the errors in the form');
    return;
  }

  const driveTreeStore = useDriveTreeStore();
  if (props.window.node) {
    driveTreeStore.setNodeLoading(props.window.node, true);
  }

  try {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);

    // should be moved to a markdown content store?
    // TODO: file needs to be sent only if the body has changed
    const file = new File(
      [contentData.value.body],
      contentData.value.meta.name,
      {
        type: DriveMimeTypes.MARKDOWN,
      },
    );

    const driveFileStore = useDriveFileStore();
    await driveFileStore.saveFile(contentData.value.meta.id, file);

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
      ref="windowForm"
      tag="form"
      class="vertical-form markdown-form"
      @submit.prevent="submit"
    >
      <div class="horizontal-control">
        <va-input
          :model-value="title"
          name="title"
          label="Title"
          :min-length="1"
          :max-length="100"
          :rules="nameValidationsRules"
          counter
          required
          :disabled="isLoading"
          @update:dirty="setDirty"
          @update:model-value="updateFileName"
        />

        <div
          v-if="contentData.meta.appProperties.kind !== AssetPropertiesKinds.TEXT"
          class="horizontal-control__item"
        >
          <va-checkbox
            v-model="contentData.meta.appProperties.showTitle"
            name="show"
            label="Show title"
            :disabled="isLoading"
            @update:dirty="setDirty"
          />
        </div>
      </div>

      <va-textarea
        ref="editor"
        v-model="contentData.body"
        name="content"
        class="markdown-editor"
        placeholder="Enter markdown here"
        resize
        :min-rows="5"
        :max-rows="25"
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
