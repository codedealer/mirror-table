<script setup lang="ts">
import type { ModalWindow } from '~/models/types';

const props = defineProps<{
  window: ModalWindow
  index: number
}>();

const tabClassList = computed(() => ({
  'window-tab--active': props.window.active,
  'window-tab--pinned': props.window.pinned,
}));

const windowStore = useWindowStore();
</script>

<template>
  <div class="ghost-container">
    <div
      :class="tabClassList"
      class="window-tab"
    >
      <va-badge
        v-show="index < 11"
        :text="index === 10 ? '0' : index.toString()"
        overlap
        placement="top-left"
        :offset="['-6px', '0']"
        color="primary-dark"
      >
        <va-button
          preset="plain"
          size="medium"
          @click="window.pinned ? windowStore.unpin(window) : windowStore.pin(window)"
        >
          <va-icon
            name="push_pin"
            size="medium"
            :color="window.pinned ? 'primary' : 'text-primary'"
            :rotation="window.pinned ? 0 : 45"
          />
        </va-button>
      </va-badge>

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
          color="text-primary"
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
