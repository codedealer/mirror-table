<script setup lang="ts">
import { useCssVar } from '@vueuse/core';
import type { DriveFile } from '~/models/types';
import { aspectRatio } from '~/utils';
import { PickerViewTemplates } from '~/models/types';

interface DriveThumbnailProps {
  width: string | number
  height: string | number
  file?: DriveFile | null
  error?: any
  fileIsLoading?: boolean
  src?: string
  title?: string
  removable?: boolean
  allowUpload?: boolean
  uploadParentId?: string
  fit?: 'auto' | 'cover' | 'contain'
}

interface DriveThumbnailEmits {
  (event: 'error', e: Event): void
  (event: 'remove'): void
  (event: 'upload', id: string): void
}

const props = withDefaults(defineProps<DriveThumbnailProps>(), {
  file: null,
  error: null,
  fileIsLoading: false,
  src: '',
  title: '',
  removable: false,
  allowUpload: false,
  uploadParentId: '',
  fit: 'auto',
});

const emits = defineEmits<DriveThumbnailEmits>();

const { canDownloadError, isImageError } = useDriveFileValidator(props.file);

const fileError = computed(() => {
  return props.error ?? canDownloadError.value ?? isImageError.value;
});

const containerAspectRatio = computed(() => aspectRatio(props.width, props.height));

const objectFit = computed(() => {
  if (props.fit === 'auto') {
    if (!props.file || !props.file.imageMediaMetadata) {
      return 'contain';
    }

    const imageAspectRatio = aspectRatio(
      props.file.imageMediaMetadata.width,
      props.file.imageMediaMetadata.height,
    );

    if (
      (imageAspectRatio > 1 && containerAspectRatio.value > 1) ||
      (imageAspectRatio < 1 && containerAspectRatio.value < 1)
    ) {
      return 'cover';
    }

    return 'contain';
  }

  return props.fit;
});

const imageSrc = computed(() => {
  if (props.src) {
    return props.src;
  }
  if (fileError.value) {
    return '';
  }
  if (props.file && props.file.imageMediaMetadata) {
    /*
     compute proper image size depending on the objectFit:
     - if objectFit is 'cover', we want to take the smallest dimension
     - if objectFit is 'contain', we want to specify both dimensions and let google drive api do the rest
    */
    let sizeArg = `w${props.width}-h${props.height}`;
    if (objectFit.value === 'cover') {
      const imageAspectRatio = aspectRatio(
        props.file.imageMediaMetadata.width,
        props.file.imageMediaMetadata.height,
      );

      if (imageAspectRatio < 1) {
        sizeArg = `w${props.width}`;
      } else {
        sizeArg = `h${props.height}`;
      }
    }

    return `https://drive.google.com/thumbnail?id=${props.file.id}&sz=${sizeArg}`;
  }
  return '';
});

const fileErrorMessage = computed(() => {
  if (props.error) {
    return extractErrorMessage(props.error);
  } else if (fileError.value) {
    return extractErrorMessage(fileError.value);
  }
  return '';
});

const container = ref(null);
const widthVar = useCssVar('--width', container);
const heightVar = useCssVar('--height', container);

onMounted(() => {
  watchEffect(() => {
    widthVar.value = String(props.width);
    heightVar.value = String(props.height);
  });
});

const uploadImage = async () => {
  const { buildPicker } = usePicker();
  const userStore = useUserStore();

  try {
    await buildPicker({
      parentId: userStore.profile!.settings.driveFolderId,
      uploadParentId: props.uploadParentId,
      template: PickerViewTemplates.IMAGES,
      allowUpload: true,
      callback: (result) => {
        if (
          result.action === google.picker.Action.PICKED &&
            result.docs.length > 0
        ) {
          const pickedFile = result.docs[0];

          emits('upload', pickedFile.id);
        }
      },
    });
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  }
};
</script>

<template>
  <div
    ref="container"
    class="drive-thumbnail"
    :style="{ width, height }"
  >
    <div
      v-if="imageSrc.length > 0 && !fileIsLoading"
      class="drive-thumbnail__image-container"
    >
      <va-image
        :src="imageSrc"
        :ratio="containerAspectRatio"
        :fit="objectFit"
        @error="e => emits('error', e)"
      >
        <template #loader>
          <div class="drive-thumbnail__placeholder">
            <va-progress-circle indeterminate />
          </div>
        </template>

        <template #error>
          <va-icon
            name="broken_image"
            color="danger"
            :size="32"
          />
        </template>
      </va-image>
      <div class="drive-thumbnail__controls">
        <va-button
          v-if="removable"
          icon="cancel"
          preset="plain"
          color="#fff"
          size="large"
          title="Remove image"
          @click="emits('remove')"
        />
      </div>
    </div>
    <div
      v-else
      class="drive-thumbnail__placeholder"
    >
      <div v-if="fileIsLoading" class="ghost-container">
        <va-progress-circle indeterminate />
      </div>
      <div v-else-if="!fileError" class="ghost-container">
        <div class="drive-thumbnail__backdrop" />
        <small>No image</small>
      </div>
      <div v-else class="ghost-container tc">
        <va-icon
          name="broken_image"
          color="danger"
          :size="32"
        />
        <small>{{ fileErrorMessage }}</small>
      </div>
      <template v-if="allowUpload && !fileIsLoading">
        <va-button
          icon="cloud_upload"
          preset="primary"
          color="primary"
          class="drive-thumbnail__upload-button"
          size="large"
          title="Upload image"
          @click="uploadImage"
        >
          Upload image
        </va-button>
      </template>
    </div>
  </div>
</template>

<style lang="scss">
.drive-thumbnail {
  width: calc(var(--width) * 1px);
  height: calc(var(--height) * 1px);
  .va-image__error {
    background-color: var(--va-background-element);
    border-radius: var(--va-block-border-radius);
  }
}
.drive-thumbnail__image-container {
  position: relative;
  width: 100%;
  height: 100%;
  &:hover {
    .drive-thumbnail__controls {
      visibility: visible;
      opacity: 1;
    }
  }
}
.drive-thumbnail__controls {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease-in-out;
}
.drive-thumbnail__placeholder {
  background-color: var(--va-background-element);
  border-radius: var(--va-block-border-radius);
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 0.5rem;
  grid-template-rows: 1fr auto;
  .drive-thumbnail__backdrop {
    background-image: url('/logo.svg');
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: .5;
    filter: saturate(.2);
    width: 100%;
    height: 100%;
    grid-column: 1;
    grid-row: 1;
  }
  small {
    opacity: .6;
    font-size: 0.8rem;
    text-transform: lowercase;
  }
}
.drive-thumbnail__upload-button {
  grid-column: 1;
  grid-row: 1;
}
</style>
