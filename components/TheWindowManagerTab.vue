<script setup lang="ts">
import type { ModalWindow } from '~/models/types';

defineProps<{
  window: ModalWindow
}>();

const windowStore = useWindowStore();
</script>

<template>
  <div class="window-tab-container">
    <div
      :class="window.active ? 'window-tab--active' : ''"
      class="window-tab"
    >
      <va-button
        preset="plain"
        icon="push_pin"
        :color="window.pinned ? 'primary' : 'background-border'"
        size="medium"
        @click="window.pinned ? windowStore.unpin(window) : windowStore.pin(window)"
      />

      <va-button
        preset="plain"
        color="text-primary"
        size="medium"
        class="window-tab__button"
        :title="window.id"
        @click="windowStore.toggle(window)"
      >
        <div class="window-tab__title text-overflow">
          {{ window.id }}
        </div>
      </va-button>

      <div class="window-tab__actions">
        <va-button
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
