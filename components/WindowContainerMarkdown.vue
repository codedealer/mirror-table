<script setup lang="ts">
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import WindowContainerMarkdownForm from '~/components/WindowContainerMarkdownForm.vue';

const props = defineProps<{
  window: ModalWindow
}>();

const modalContentData = computed(() =>
  (props.window.content as ModalWindowContentMarkdown).data,
);

const createdDate = computed(() => {
  if (!modalContentData.value.meta.createdTime) {
    return '';
  }

  return new Date(modalContentData.value.meta.createdTime).toLocaleString();
});

const modifiedDate = computed(() => {
  if (!modalContentData.value.meta.modifiedTime) {
    return '';
  }

  return new Date(modalContentData.value.meta.modifiedTime).toLocaleString();
});

const permissions = computed(() => ({
  canEdit: modalContentData.value.meta.capabilities?.canEdit,
}));

const toggleEdit = () => {
  if (!permissions.value.canEdit) {
    return;
  }

  const windowStore = useWindowStore();
  windowStore.toggleEdit(props.window);
};
</script>

<template>
  <div class="window-container-markdown">
    <div class="window-container-markdown__actions mb">
      <va-button
        icon="edit"
        :color="window.content.editing ? 'primary-dark' : 'background-border'"
        size="small"
        :disabled="!permissions.canEdit"
        @click="toggleEdit"
      />

      <va-spacer />

      <VaButtonDropdown
        color="background-border"
        preset="plain"
        size="small"
        hide-icon
      >
        <template #label>
          <VaIcon
            name="info"
          />
        </template>

        <div class="window-container-markdown__meta">
          <div class="window-container-markdown__meta__item">
            <span class="window-container-markdown__meta__item__label">
              Filename:
            </span>
            <span class="window-container-markdown__meta__item__value">
              {{ modalContentData.meta.name }}
            </span>
          </div>
          <div class="window-container-markdown__meta__item">
            <span class="window-container-markdown__meta__item__label">
              Created:
            </span>
            <span class="window-container-markdown__meta__item__value">
              {{ createdDate }}
            </span>
          </div>
          <div class="window-container-markdown__meta__item">
            <span class="window-container-markdown__meta__item__label">
              Last Modified:
            </span>
            <span class="window-container-markdown__meta__item__value">
              {{ modifiedDate }}
            </span>
          </div>
        </div>
      </VaButtonDropdown>
    </div>
    <div class="window-container-markdown__content mb">
      <div
        v-show="!window.content.editing"
        class="window-container-markdown__markdown"
      >
        {{ modalContentData.body }}
      </div>
      <WindowContainerMarkdownForm
        v-show="window.content.editing"
        :window="window"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
