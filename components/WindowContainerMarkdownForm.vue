<script setup lang="ts">
import { useForm } from 'vuestic-ui';
import type { DriveAsset, ModalWindow, RawMediaObject } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';
import { nameValidationsRules } from '~/utils';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';
import { usePreviewImage } from '~/composables/usePreviewImage';

const props = defineProps<{
  window: ModalWindow
  media?: RawMediaObject
}>();

const { file, label } = useDriveFile<DriveAsset>(
  toRef(() => props.window.id),
  {
    predicate: isDriveAsset,
    strategy: DataRetrievalStrategies.OPTIMISTIC_CACHE,
  },
);

const {
  imageFileId,
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(file, {
  strategy: DataRetrievalStrategies.RECENT,
});

const isLoading = computed(() => (
  props.window.status === ModalWindowStatus.LOADING ||
  file.value?.loading ||
  imageLoading.value
));

const body = ref('');

// update the editor when the media is downloaded
watchEffect(() => {
  body.value = props.media?.data ?? '';
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
  if (
    isLoading.value ||
    props.window.status === ModalWindowStatus.DIRTY
  ) {
    return;
  }

  windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
};

const onImageUpdate = (fileId: string = '') => {
  imageFileId.value = fileId;
  setDirty();
};

const windowForm = ref();
const { validate } = useForm(windowForm);

const updatePreviewProperties = () => {
  if (!file.value) {
    return;
  }

  // check if the image is dirty
  if (
    (!imageFileId.value && !file.value.appProperties.preview) ||
    (imageFileId.value === file.value.appProperties.preview?.id)
  ) {
    return;
  }

  if (!imageFile.value) {
    // remove the existing preview
    file.value.appProperties.preview = null;
    return;
  }

  // set the new preview
  file.value.appProperties.preview = PreviewPropertiesFactory({
    id: imageFile.value.id,
    nativeWidth: imageFile.value.imageMediaMetadata.width,
    nativeHeight: imageFile.value.imageMediaMetadata.height,
  });
};

const submit = async () => {
  if (!file.value || isLoading.value || imageLoading.value) {
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

    // save image if available
    if (file.value.appProperties.kind !== AssetPropertiesKinds.TEXT) {
      updatePreviewProperties();
    }

    // file needs to be sent only if the body has changed
    let blob: File | undefined;
    // check if the editor is dirty
    if (props.media && body.value !== props.media.data) {
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
    /* if (blob) {
      windowContent.value.data = body.value;
    } */

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
          :upload-parent-id="file?.parents?.[0]"
          width="200"
          height="200"
          :allow-upload="!!file"
          removable
          @remove="onImageUpdate"
          @upload="onImageUpdate"
          @error="console.error"
        />
      </div>

      <va-textarea
        v-if="media"
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
          :disabled="!file || window.status === ModalWindowStatus.SYNCED"
          :loading="isLoading"
        >
          Save
        </va-button>
      </div>
    </va-form>
  </div>
</template>
