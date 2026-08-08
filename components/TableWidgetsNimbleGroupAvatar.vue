<script setup lang="ts">
import type { PreviewProperties } from '~/models/types';

const props = defineProps<{
  preview: PreviewProperties;
  title: string;
}>();

const { file, error, isLoading } = usePreviewImage(toRef(() => props.preview), {
  strategy: DataRetrievalStrategies.LAZY,
});
</script>

<template>
  <DriveThumbnail
    :file="file"
    :error="error"
    :file-is-loading="isLoading"
    width="64"
    height="64"
    fit="cover"
    :title="title"
  />
</template>
