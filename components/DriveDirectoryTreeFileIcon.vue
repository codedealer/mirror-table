<script setup lang="ts">
import type { DriveFile, DriveTreeNode } from '~/models/types';
import { AssetPropertiesKinds, isDriveAsset } from '~/models/types';

const props = defineProps<{
  node: DriveTreeNode
  file?: DriveFile
}>();

const { file, error } = useDriveFile(toRef(() => props.node.id));

const iconName = computed(() => {
  if (!file.value || !isDriveAsset(file.value)) {
    return 'article';
  }

  let name = 'article';

  switch (file.value.appProperties.kind) {
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
