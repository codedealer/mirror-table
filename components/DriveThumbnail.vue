<script setup lang="ts">
import { useCssVar } from '@vueuse/core';

interface DriveThumbnailProps {
  fileId?: string
  src?: string
  title?: string
  width: string
  height: string
  onClick?: () => void
}

const props = withDefaults(defineProps<DriveThumbnailProps>(), {
  fileId: '',
  src: '',
  title: '',
  onClick: () => {},
});

const imageSrc = computed(() => {
  if (props.src) {
    return props.src;
  }
  if (props.fileId) {
    return `https://drive.google.com/thumbnail?id=${props.fileId}&sz=w${props.width}-h${props.height}`;
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
    <va-image
      v-if="imageSrc.length > 0"
      :src="imageSrc"
      :ratio="width / height"
      fit="contain"
    >
      <template #loader>
        <va-progress-circle indeterminate />
      </template>

      <template #error>
        <va-icon
          name="close"
          color="danger"
          :size="32"
        />
      </template>
    </va-image>
    <div
      v-else
      class="drive-thumbnail__placeholder"
    />
  </div>
</template>

<style lang="scss">
.drive-thumbnail {
  /*display: grid;
  place-items: center;*/
  width: calc(var(--width) * 1px);
  height: calc(var(--height) * 1px);
}
.drive-thumbnail__placeholder {
  background-color: hotpink;
  height: 100%;
  width: 100%;
}
</style>
