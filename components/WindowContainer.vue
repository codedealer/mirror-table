<script setup lang="ts">
import type { ModalWindow } from '~/models/types';
import { useDraggable } from '@vueuse/core';
import WindowContainerWidget from '~/components/WindowContainerWidget.vue';

const props = defineProps<{
  window: ModalWindow;
}>();

const DEFAULT_WINDOW_OFFSET = 24;

const modal = ref<HTMLElement | null>(null);
const modalTitle = ref<HTMLElement | null>(null);
const windowStore = useWindowStore();
const isMaximized = ref(false);
const restoreState = ref<{ x: number; y: number; width: string; height: string } | null>(null);

const { x, y, isDragging } = useDraggable(modal, {
  handle: modalTitle,
  preventDefault: true,
  initialValue: {
    x: 0,
    y: 0,
  },
});

const getWorkspaceBounds = () => {
  const el = document.querySelector('.main-grid__content');
  return el?.getBoundingClientRect() ?? null;
};

const clampToWorkspace = (nextX = x.value, nextY = y.value) => {
  const bounds = getWorkspaceBounds();
  const el = modal.value;

  if (!bounds || !el) {
    return {
      x: nextX,
      y: nextY,
    };
  }

  return {
    x: Math.max(bounds.left, Math.min(nextX, Math.max(bounds.left, bounds.right - el.offsetWidth))),
    y: Math.max(bounds.top, Math.min(nextY, Math.max(bounds.top, bounds.bottom - el.offsetHeight))),
  };
};

const positionWithinWorkspace = (offset = DEFAULT_WINDOW_OFFSET) => {
  const bounds = getWorkspaceBounds();
  const el = modal.value;

  if (!bounds || !el) {
    return;
  }

  x.value = Math.min(bounds.left + offset, Math.max(bounds.left, bounds.right - el.offsetWidth));
  y.value = Math.min(bounds.top + offset, Math.max(bounds.top, bounds.bottom - el.offsetHeight));
};

const containerStyle = computed(() => {
  const bounds = getWorkspaceBounds();
  const position = clampToWorkspace();

  return {
    'left': `${position.x}px`,
    'top': `${position.y}px`,
    '--window-workspace-max-width': bounds ? `${bounds.width}px` : undefined,
    '--window-workspace-max-height': bounds ? `${bounds.height}px` : undefined,
  };
});

const toggleMaximize = () => {
  const bounds = getWorkspaceBounds();
  const el = modal.value;

  if (!bounds || !el) {
    return;
  }

  if (isMaximized.value) {
    if (restoreState.value) {
      x.value = restoreState.value.x;
      y.value = restoreState.value.y;
      el.style.width = restoreState.value.width;
      el.style.height = restoreState.value.height;
    } else {
      el.style.width = '';
      el.style.height = '';
      positionWithinWorkspace();
    }

    const position = clampToWorkspace();
    x.value = position.x;
    y.value = position.y;
    isMaximized.value = false;
  } else {
    const position = clampToWorkspace();
    restoreState.value = {
      x: position.x,
      y: position.y,
      width: `${el.offsetWidth}px`,
      height: `${el.offsetHeight}px`,
    };

    x.value = bounds.left;
    y.value = bounds.top;
    el.style.width = `${bounds.width}px`;
    el.style.height = `${bounds.height}px`;
    isMaximized.value = true;
  }
};

onMounted(() => {
  nextTick(() => {
    positionWithinWorkspace();
  });
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
