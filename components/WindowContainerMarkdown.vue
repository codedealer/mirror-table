<script setup lang="ts">
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';

const props = defineProps<{
  window: ModalWindow
}>();

const modalContent = computed<ModalWindowContentMarkdown>(() =>
  props.window.content as ModalWindowContentMarkdown,
);
</script>

<template>
  <div class="window-container-markdown">
    <div class="window-container-markdown__content">
      <div class="window-container-markdown__meta">
        <div class="window-container-markdown__meta__item">
          <span class="window-container-markdown__meta__item__label">
            Name:
          </span>
          <span class="window-container-markdown__meta__item__value">
            {{ modalContent.data.meta.name }}
          </span>
        </div>
        <div class="window-container-markdown__meta__item">
          <span class="window-container-markdown__meta__item__label">
            Created:
          </span>
          <span class="window-container-markdown__meta__item__value">
            {{ modalContent.data.meta.createdTime }}
          </span>
        </div>
        <div class="window-container-markdown__meta__item">
          <span class="window-container-markdown__meta__item__label">
            Last Modified:
          </span>
          <span class="window-container-markdown__meta__item__value">
            {{ modalContent.data.meta.modifiedTime }}
          </span>
        </div>
      </div>
      <div class="window-container-markdown__markdown">
        {{ modalContent.data.body }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
