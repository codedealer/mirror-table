<script setup lang="ts">
import type {
  DriveAsset,
  ModalWindow,
  ModalWindowContentMarkdown,
  RawMediaObject,
} from '~/models/types';

import WindowContainerMarkdownForm from '~/components/WindowContainerMarkdownForm.vue';
import WindowContainerMarkdownMeta from '~/components/WindowContainerMarkdownMeta.vue';

const props = defineProps<{
  window: ModalWindow
}>();

const windowContent = computed(() =>
  props.window.content as ModalWindowContentMarkdown,
);

const { file } = useDriveFile<DriveAsset>(
  toRef(() => props.window.id),
  {
    strategy: DataRetrievalStrategies.RECENT,
    predicate: isDriveAsset,
  },
);

const media = ref<RawMediaObject | undefined>();

// this will reload new file every time md5Checksum changes
const loadMedia = async () => {
  if (
    !file.value ||
    file.value.appProperties.kind === AssetPropertiesKinds.IMAGE ||
    (
      file.value.id === media.value?.id &&
      file.value.md5Checksum === media.value?.md5Checksum
    )
  ) {
    return;
  }

  const driveFileStore = useDriveFileStore();
  const windowStore = useWindowStore();

  try {
    console.log(`Downloading media for ${file.value.id}`);

    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);
    const mediaObj = await driveFileStore.downloadMedia(props.window.id);

    if (!mediaObj) {
      throw new Error('Could not download file');
    }

    media.value = mediaObj;

    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  }
};

watch(file, loadMedia, {
  immediate: true,
  deep: true,
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
        :content="windowContent"
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
