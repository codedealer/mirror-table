<script setup lang="ts">
import type { DriveWidget, ModalWindow, WidgetTemplate } from '~/models/types';
import { WindowContainerWidgetCandelaPlayer, WindowContainerWidgetMarkdown } from '#components';
import { WidgetTemplates } from '~/models/types';

const props = defineProps<{
  window: ModalWindow;
}>();

const { file, error } = useDriveFile<DriveWidget>(
  toRef(() => props.window.id),
  {
    strategy: DataRetrievalStrategies.RECENT,
    predicate: isDriveWidget,
  },
);

const { actions } = useWindowContextActions(
  file,
  toRef(() => props.window),
);

const windowStore = useWindowStore();

const isTrashed = computed(() => !!file.value?.trashed);

watchEffect(() => {
  if (error.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(error.value));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  } else if (file.value?.loading) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);
  } else if (file.value?.trashed) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } else if (props.window.status !== ModalWindowStatus.DIRTY) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  }
});

watchEffect(() => {
  if (!file.value || !file.value.name) {
    return;
  }

  windowStore.setWindowTitle(props.window, stripFileExtension(file.value.name));
});

const availableTemplates: Record<WidgetTemplate, unknown> = {
  [WidgetTemplates.MARKDOWN]: WindowContainerWidgetMarkdown,
  [WidgetTemplates.CANDELA_PLAYER]: WindowContainerWidgetCandelaPlayer,
};

const content = computed(() => {
  const template = file.value?.appProperties.template;

  if (!template) {
    return null;
  }

  return availableTemplates[template];
});
</script>

<template>
  <div class="window-container-widget window-container-markdown">
    <div class="window-container-markdown__actions mb">
      <va-spacer />

      <WindowContainerMarkdownMeta
        :file="file"
      />

      <ContextPanel
        :actions="actions"
        dropdown-only
        preset="plain"
        size="small"
        color="background-border"
      />
    </div>

    <WindowTrashedBanner
      class="mb"
      :file="file"
    />
    <div class="window-container-markdown__content">
      <va-scroll-container vertical>
        <component
          :is="content"
          :window="window"
          :file="file"
          :blocked="isTrashed"
        />
      </va-scroll-container>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
