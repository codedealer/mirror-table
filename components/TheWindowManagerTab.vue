<script setup lang="ts">
import type { ModalWindow } from '~/models/types';

const props = defineProps<{
  window: ModalWindow
}>();

const tabClassList = computed(() => ({
  'window-tab--active': props.window.active,
  'window-tab--pinned': props.window.pinned,
}));

const windowStore = useWindowStore();
</script>

<template>
  <div class="window-tab-container" :class="tabClassList">
    <div
      :class="tabClassList"
      class="window-tab"
    >
      <va-button
        preset="plain"
        size="medium"
        @click="window.pinned ? windowStore.unpin(window) : windowStore.pin(window)"
      >
        <va-icon
          name="push_pin"
          size="medium"
          :color="window.pinned ? 'primary' : 'background-border'"
          :rotation="window.pinned ? 0 : 45"
        />
      </va-button>

      <va-button
        preset="plain"
        color="text-primary"
        size="medium"
        class="window-tab__button"
        :title="window.title ?? window.id"
        @click="windowStore.toggle(window)"
      >
        <div
          :class="{ unsaved: window.status === ModalWindowStatus.DIRTY }"
          class="window-tab__title text-overflow"
        >
          {{ window.title ?? window.id }}
        </div>
      </va-button>

      <div class="window-tab__actions">
        <va-button
          v-show="!window.pinned"
          preset="plain"
          icon="cancel"
          color="background-border"
          size="medium"
          @click="windowStore.remove(window)"
        />
      </div>
    </div>

    <teleport to="body">
      <WindowContainer
        :window="window"
      />
    </teleport>
  </div>
</template>

<style scoped lang="scss">

</style>
