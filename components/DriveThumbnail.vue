<script setup lang="ts">
import { useCssVar } from '@vueuse/core';
import type { DriveFile } from '~/models/types';

interface DriveThumbnailProps {
  file?: DriveFile | null
  error?: any
  fileIsLoading?: boolean
  src?: string
  title?: string
  width: string
  height: string
  removable?: boolean
}

interface DriveThumbnailEmits {
  (event: 'error', e: Event): void
  (event: 'remove'): void
}

const props = withDefaults(defineProps<DriveThumbnailProps>(), {
  file: null,
  error: null,
  fileIsLoading: false,
  src: '',
  title: '',
  removable: false,
});

const emits = defineEmits<DriveThumbnailEmits>();

const imageSrc = computed(() => {
  if (props.src) {
    return props.src;
  }
  if (props.error) {
    return '';
  }
  if (props.file) {
    return `https://drive.google.com/thumbnail?id=${props.file.id}&sz=w${props.width}-h${props.height}`;
  }
  return '';
});

const fileErrorMessage = computed(() => {
  if (props.error) {
    return extractErrorMessage(props.error);
  }
  return '';
});

const container = ref(null);
const widthVar = useCssVar('--width', container);
const heightVar = useCssVar('--height', container);

onMounted(() => {
  watchEffect(() => {
    widthVar.value = props.width;
    heightVar.value = props.height;
  });
});
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
        :ratio="width / height"
        fit="contain"
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
      <div v-else-if="!error" class="ghost-container">
        <div class="drive-thumbnail__backdrop" />
        <small>No image</small>
      </div>
      <div v-else class="ghost-container">
        <va-icon
          name="broken_image"
          color="danger"
          :size="32"
        />
        <small>{{ fileErrorMessage }}</small>
      </div>
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
}
.drive-thumbnail__controls {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem;
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
  }
  small {
    opacity: .6;
    font-size: 0.8rem;
    text-transform: lowercase;
  }
}
</style>
