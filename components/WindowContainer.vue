<script setup lang="ts">
import { useDraggable } from '@vueuse/core';
import type { ModalWindow } from '~/models/types';

defineProps<{
  window: ModalWindow
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
</script>

<template>
  <transition name="window">
    <div
      v-show="window.active"
      ref="modal"
      class="window-container asset-modal"
      :style="style"
    >
      <div
        ref="modalTitle"
        class="asset-modal__title"
      >
        <h4 class="title">
          {{ window.id }}
        </h4>

        <div class="asset-modal__actions">
          <va-button
            preset="plain"
            icon="cancel"
            color="background-border"
            size="medium"
            @click="windowStore.toggle(window)"
          />
        </div>
      </div>

      <div
        class="window-container__content"
      >
        <div class="text-editor">
          <textarea
            class="text-editor__textarea"
            rows="100"
            cols="80"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">

</style>
