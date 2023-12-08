<script setup lang="ts">
import { useForm } from 'vuestic-ui';
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';
import { nameValidationsRules, stripFileExtension } from '~/utils';

const props = defineProps<{
  window: ModalWindow
}>();

const contentData = computed(() =>
  (props.window.content as ModalWindowContentMarkdown).data,
);

const isLoading = computed(() => props.window.status === ModalWindowStatus.LOADING);
const title = computed(() => {
  return stripFileExtension(contentData.value.meta.name);
});
const body = ref('');

onMounted(() => {
  body.value = contentData.value.body;
});

const windowStore = useWindowStore();

const updateFileName = (fileName: string) => {
  let newName = fileName;
  if (contentData.value.meta.fileExtension) {
    newName += `.${contentData.value.meta.fileExtension}`;
  }
  contentData.value.meta.name = newName;

  // update properties title
  contentData.value.meta.appProperties.title = fileName;

  // update window title
  windowStore.setWindowTitle(props.window, fileName);

  // update node label
  if (props.window.node) {
    const driveTreeStore = useDriveTreeStore();
    driveTreeStore.setNodeLabel(props.window.node, fileName);
  }
};

const setDirty = () => {
  if (props.window.status === ModalWindowStatus.LOADING ||
      props.window.status === ModalWindowStatus.DIRTY) {
    return;
  }

  windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
};

const windowForm = ref();
const { validate } = useForm(windowForm);

const submit = async () => {
  if (contentData.value.meta.appProperties.title === '') {
    contentData.value.meta.appProperties.title = title.value;
    await nextTick();
  }
  if (!validate()) {
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

    // file needs to be sent only if the body has changed
    let file: File | undefined;
    // check if the editor is dirty
    if (body.value !== contentData.value.body) {
      file = new File(
        [body.value],
        contentData.value.meta.name,
        {
          type: DriveMimeTypes.MARKDOWN,
        },
      );
    }

    const driveFileStore = useDriveFileStore();
    await driveFileStore.saveFile(contentData.value.meta.id, file);
    if (file) {
      contentData.value.body = body.value;
    }

    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (e) {
    console.error(e);
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
          class="horizontal-control"
        >
          <va-checkbox
            v-model="contentData.meta.appProperties.showTitle"
            name="show"
            label="Show title"
            color="primary-dark"
            :disabled="isLoading"
            @update:dirty="setDirty"
          />

          <va-input
            v-show="contentData.meta.appProperties.showTitle"
            v-model="contentData.meta.appProperties.title"
            name="display-title"
            label="Display Title"
            :min-length="1"
            :max-length="100"
            :rules="nameValidationsRules"
            counter
            :disabled="isLoading"
            @update:dirty="setDirty"
          />
        </div>
      </div>

      <va-textarea
        v-model="body"
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
