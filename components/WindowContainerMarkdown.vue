<script setup lang="ts">
import type {
  DriveAsset,
  ModalWindow,
} from '~/models/types';

import WindowContainerMarkdownForm from '~/components/WindowContainerMarkdownForm.vue';
import WindowContainerMarkdownMeta from '~/components/WindowContainerMarkdownMeta.vue';
import { useDriveMedia } from '~/composables/useDriveMedia';

const props = defineProps<{
  window: ModalWindow
}>();

const { file } = useDriveFile<DriveAsset>(
  toRef(() => props.window.id),
  {
    strategy: DataRetrievalStrategies.RECENT,
    predicate: isDriveAsset,
  },
);

const { media, error: mediaError } = useDriveMedia(file);

const windowStore = useWindowStore();

watchEffect(() => {
  if (mediaError.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(mediaError.value));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  } else if (file.value?.loading) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);
  } else if (props.window.status !== ModalWindowStatus.DIRTY) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  }
});

const permissions = computed(() => ({
  canEdit: file.value?.capabilities?.canEdit,
}));

const toggleEdit = () => {
  if (!permissions.value.canEdit) {
    return;
  }

  const windowStore = useWindowStore();
  windowStore.toggleEdit(props.window);
};
</script>

<template>
  <div class="window-container-markdown">
    <div class="window-container-markdown__actions mb">
      <va-button
        icon="edit"
        :color="window.content.editing ? 'primary-dark' : 'background-border'"
        size="small"
        :disabled="!permissions.canEdit"
        @click="toggleEdit"
      />

      <va-spacer />

      <WindowContainerMarkdownMeta
        :file="file"
      />
    </div>
    <div class="window-container-markdown__content mb">
      <va-scroll-container
        vertical
      >
        <WindowContainerMarkdownContent
          v-show="!window.content.editing"
          :window="window"
          :media="media"
        />

        <WindowContainerMarkdownForm
          v-show="window.content.editing"
          :window="window"
          :media="media"
        />
      </va-scroll-container>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
