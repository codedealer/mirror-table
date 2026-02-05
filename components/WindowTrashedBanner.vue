<script setup lang="ts">
import type { DriveFile } from '~/models/types';

const props = defineProps<{
  file?: DriveFile;
}>();

const isTrashed = computed(() => !!props.file?.trashed);

const restoring = ref(false);
const restore = async () => {
  if (!props.file || !props.file.id || !isTrashed.value) {
    return;
  }

  try {
    restoring.value = true;

    const driveFileStore = useDriveFileStore();
    await driveFileStore.removeFile(props.file.id, true);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
    console.error(e);
  } finally {
    restoring.value = false;
  }
};
</script>

<template>
  <div
    v-show="isTrashed"
    class="window-trashed-banner"
  >
    <div class="window-trashed-banner__content">
      <va-icon
        name="delete"
        color="danger"
        size="small"
      />
      <div class="window-trashed-banner__text">
        This file is in trash. Restore it to edit.
      </div>
    </div>

    <va-button
      preset="plain"
      color="primary-dark"
      size="small"
      icon="replay"
      :loading="restoring"
      :disabled="!file?.capabilities?.canDelete"
      @click.stop="restore"
    >
      Restore
    </va-button>
  </div>
</template>

<style scoped lang="scss">
.window-trashed-banner {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;

  padding: 0.5rem;
  border: 1px solid var(--va-danger);
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--va-danger) 12%, transparent);
}

.window-trashed-banner__content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.window-trashed-banner__text {
  font-size: 0.85rem;
  opacity: 0.9;
}
</style>
