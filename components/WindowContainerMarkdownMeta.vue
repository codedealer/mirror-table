<script setup lang="ts">
import type { DriveFile } from '~/models/types';

const props = defineProps<{
  file?: DriveFile;
}>();

const createdDate = computed(() => {
  if (!props.file?.createdTime) {
    return '';
  }

  return new Date(props.file.createdTime).toLocaleString();
});

const modifiedDate = computed(() => {
  if (!props.file?.modifiedTime) {
    return '';
  }

  return new Date(props.file.modifiedTime).toLocaleString();
});
</script>

<template>
  <VaButtonDropdown
    color="background-border"
    preset="plain"
    size="small"
    hide-icon
  >
    <template #label>
      <VaIcon
        name="info"
      />
    </template>

    <div class="window-container-markdown__meta">
      <div class="window-container-markdown__meta__item">
        <span class="window-container-markdown__meta__item__label">
          Filename:
        </span>
        <span class="window-container-markdown__meta__item__value">
          {{ file?.name }}
        </span>
      </div>
      <div class="window-container-markdown__meta__item">
        <span class="window-container-markdown__meta__item__label">
          Created:
        </span>
        <span class="window-container-markdown__meta__item__value">
          {{ createdDate }}
        </span>
      </div>
      <div class="window-container-markdown__meta__item">
        <span class="window-container-markdown__meta__item__label">
          Last Modified:
        </span>
        <span class="window-container-markdown__meta__item__value">
          {{ modifiedDate }}
        </span>
      </div>
    </div>
  </VaButtonDropdown>
</template>

<style scoped lang="scss">

</style>
