<script setup lang="ts">
import type { DriveWidget, ModalWindow, WidgetTemplate } from '~/models/types';
import { WidgetTemplates } from '~/models/types';
import { WindowContainerWidgetCandelaPlayer, WindowContainerWidgetMarkdown } from '#components';

const props = defineProps<{
  window: ModalWindow
}>();

const { file, error } = useDriveFile<DriveWidget>(
  toRef(() => props.window.id),
  {
    strategy: DataRetrievalStrategies.RECENT,
    predicate: isDriveWidget,
  },
);

const windowStore = useWindowStore();

watchEffect(() => {
  if (error.value) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(error.value));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  } else if (file.value?.loading) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);
  } else if (props.window.status !== ModalWindowStatus.DIRTY) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  }
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
    <div class="window-container-markdown__content">
      <va-scroll-container vertical>
        <component
          :is="content"
          :window="window"
          :file="file"
        />
      </va-scroll-container>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
