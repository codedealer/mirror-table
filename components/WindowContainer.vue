<script setup lang="ts">
import type { ModalWindow } from '~/models/types';
import { useDraggable } from '@vueuse/core';
import WindowContainerWidget from '~/components/WindowContainerWidget.vue';

const props = defineProps<{
  window: ModalWindow;
}>();

const modal = ref(null);
const modalTitle = ref(null);
const windowStore = useWindowStore();
const { style } = useDraggable(modal, {
  handle: modalTitle,
  preventDefault: true,
  initialValue: {
    x: 60,
    y: 60,
  },
});

const statusIconName = computed(() => {
  switch (props.window.status) {
    case ModalWindowStatus.LOADING:
      return 'sync';
    case ModalWindowStatus.DIRTY:
      return 'warning';
    case ModalWindowStatus.SYNCED:
      return 'cloud_done';
    case ModalWindowStatus.ERROR:
      return 'error';
    default:
      return '';
  }
});

const statusLabel = computed(() => {
  switch (props.window.status) {
    case ModalWindowStatus.LOADING:
      return 'Syncing changes...';
    case ModalWindowStatus.DIRTY:
      return 'Unsaved changes';
    case ModalWindowStatus.SYNCED:
      return 'Asset is up to date';
    case ModalWindowStatus.ERROR:
      return 'Error';
    default:
      return '';
  }
});
</script>

<template>
  <transition name="window">
    <div
      v-show="window.active"
      ref="modal"
      class="window-container"
      :class="windowStore.lastActiveWindowId === window.id ? 'window-container--top' : ''"
      :style="style"
      @pointerdown.capture="windowStore.setLastActiveWindowId(window)"
    >
      <div
        ref="modalTitle"
        class="asset-modal__title"
      >
        <h4 class="title">
          {{ window.title }}
        </h4>

        <div class="asset-modal__actions">
          <va-popover :message="statusLabel" placement="bottom">
            <va-icon
              v-if="statusIconName"
              :name="statusIconName"
              :color="window.status === ModalWindowStatus.ERROR ? 'danger' : 'text-primary'"
              :spin="window.status === ModalWindowStatus.LOADING"
              size="large"
            />
          </va-popover>

          <va-button
            preset="plain"
            icon="cancel"
            color="text-primary"
            size="large"
            @click="windowStore.toggle(window)"
          />
        </div>
      </div>

      <WindowContainerMarkdown
        v-if="window.content.type === 'markdown'"
        :window="window"
      />
      <WindowContainerWidget
        v-else-if="window.content.type === 'widget'"
        :window="window"
      />
    </div>
  </transition>
</template>

<style scoped lang="scss">

</style>
