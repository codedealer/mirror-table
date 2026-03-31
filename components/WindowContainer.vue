<script setup lang="ts">
import type { ModalWindow } from '~/models/types';
import { useDraggable } from '@vueuse/core';
import WindowContainerWidget from '~/components/WindowContainerWidget.vue';

const props = defineProps<{
  window: ModalWindow;
}>();

const modal = ref<HTMLElement | null>(null);
const modalTitle = ref<HTMLElement | null>(null);
const windowStore = useWindowStore();
const isMaximized = ref(false);

const { x, y, isDragging } = useDraggable(modal, {
  handle: modalTitle,
  preventDefault: true,
  initialValue: {
    x: 60,
    y: 60,
  },
});

const getWorkspaceBounds = () => {
  const el = document.querySelector('.main-grid__content');
  return el?.getBoundingClientRect() ?? null;
};

const containerStyle = computed(() => {
  let cx = x.value;
  let cy = y.value;

  const bounds = getWorkspaceBounds();
  const el = modal.value;
  if (bounds && el) {
    cx = Math.max(bounds.left, Math.min(cx, bounds.right - el.offsetWidth));
    cy = Math.max(bounds.top, Math.min(cy, bounds.bottom - el.offsetHeight));
  }

  return {
    left: `${cx}px`,
    top: `${cy}px`,
  };
});

const toggleMaximize = () => {
  const bounds = getWorkspaceBounds();
  if (!bounds) {
    return;
  }

  const el = modal.value;
  if (isMaximized.value) {
    if (el) {
      el.style.width = '';
      el.style.height = '';
    }
    x.value = 60;
    y.value = 60;
    isMaximized.value = false;
  } else {
    x.value = bounds.left;
    y.value = bounds.top;
    if (el) {
      el.style.width = `${bounds.width}px`;
      el.style.height = `${bounds.height}px`;
    }
    isMaximized.value = true;
  }
};

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
      :class="{
        'window-container--top': windowStore.lastActiveWindowId === window.id,
        'window-container--dragging': isDragging,
      }"
      :style="containerStyle"
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
            :icon="isMaximized ? 'filter_none' : 'crop_square'"
            color="text-primary"
            size="large"
            @click="toggleMaximize"
          />

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
