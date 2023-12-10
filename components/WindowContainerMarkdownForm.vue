<script setup lang="ts">
import { useForm } from 'vuestic-ui';
import type { DriveAsset, DriveImage, ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';
import { nameValidationsRules } from '~/utils';

const props = defineProps<{
  window: ModalWindow
}>();

const windowContent = computed(() =>
  props.window.content as ModalWindowContentMarkdown,
);

const imageFileId = ref('');
const { file: imageFile, isLoading: imageLoading, error: imageError } = useDriveFile<DriveImage>(imageFileId, {
  activelyLoad: true,
});

const { file, label } = useDriveFile<DriveAsset>(
  ref(props.window.id),
  {
    appPropertiesType: AppPropertiesTypes.ASSET,
  },
);

const isLoading = computed(() => (
  props.window.status === ModalWindowStatus.LOADING ||
  file.value?.loading ||
  imageLoading.value
));

const body = ref('');

watchEffect(() => {
  body.value = windowContent.value.data;
});

const windowStore = useWindowStore();

const updateFileName = (fileName: string) => {
  if (!file.value) {
    return;
  }

  let newName = fileName;
  if (file.value?.fileExtension) {
    newName += `.${file.value.fileExtension}`;
  }

  file.value.name = newName;

  // update properties title
  file.value.appProperties.title = fileName;
};

watchEffect(() => {
  windowStore.setWindowTitle(props.window, label.value);
});

const setDirty = () => {
  if (isLoading.value ||
      props.window.status === ModalWindowStatus.DIRTY) {
    return;
  }

  windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
};

const windowForm = ref();
const { validate } = useForm(windowForm);

const submit = async () => {
  if (!file.value || isLoading.value) {
    return;
  }
  if (file.value.appProperties.title === '') {
    file.value.appProperties.title = label.value;
    await nextTick();
  }
  if (!validate()) {
    const notificationStore = useNotificationStore();
    notificationStore.error('Please fix the errors in the form');
    return;
  }

  try {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);

    // file needs to be sent only if the body has changed
    let blob: File | undefined;
    // check if the editor is dirty
    if (body.value !== windowContent.value.data) {
      blob = new File(
        [body.value],
        file.value.name,
        {
          type: DriveMimeTypes.MARKDOWN,
        },
      );
    }

    const driveFileStore = useDriveFileStore();
    await driveFileStore.saveFile(file.value.id, blob);
    if (blob) {
      windowContent.value.data = body.value;
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
  <div class="markdown-form-container">
    <va-form
      ref="windowForm"
      tag="form"
      class="vertical-form markdown-form"
      @submit.prevent="submit"
    >
      <div class="horizontal-control">
        <va-input
          :model-value="label"
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
          v-if="file?.appProperties?.kind !== AssetPropertiesKinds.TEXT"
          class="horizontal-control"
        >
          <va-checkbox
            v-if="file"
            v-model="file.appProperties.showTitle"
            name="show"
            label="Show title"
            color="primary-dark"
            :disabled="isLoading"
            @update:dirty="setDirty"
          />

          <va-input
            v-if="file"
            v-show="file.appProperties.showTitle"
            v-model="file.appProperties.title"
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

      <div
        v-if="file?.appProperties?.kind !== AssetPropertiesKinds.TEXT"
        class="vertical-form__image"
      >
        <DriveThumbnail
          :file="imageFile"
          :error="imageError"
          :file-is-loading="imageLoading"
          width="200"
          height="200"
          removable
          @remove="imageFileId = ''"
        />
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
