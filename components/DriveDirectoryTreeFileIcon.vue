<script setup lang="ts">
import type { DriveFile } from '~/models/types';
import { AssetPropertiesKinds, isDriveAsset, isDriveWidget } from '~/models/types';

const props = defineProps<{
  file?: DriveFile
  error: unknown
}>();

const iconName = computed(() => {
  if (!props.file) {
    return 'article';
  }

  if (isDriveWidget(props.file)) {
    return 'extension';
  }

  if (!isDriveAsset(props.file)) {
    return 'article';
  }

  let name = 'article';

  switch (props.file.appProperties.kind) {
    case AssetPropertiesKinds.IMAGE:
      name = 'portrait';
      break;
    case AssetPropertiesKinds.COMPLEX:
      name = 'art_track';
      break;
  }

  return name;
});
</script>

<template>
  <div class="drive-node__icon">
    <va-icon
      v-if="error"
      name="error"
      color="danger"
      size="large"
    />

    <va-icon
      v-else
      :name="iconName"
      size="large"
      color="primary"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
