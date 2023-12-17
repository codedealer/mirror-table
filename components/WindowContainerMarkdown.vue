<script setup lang="ts">
import type { ModalWindow, ModalWindowContentMarkdown } from '~/models/types';
import WindowContainerMarkdownForm from '~/components/WindowContainerMarkdownForm.vue';
import WindowContainerMarkdownMeta from '~/components/WindowContainerMarkdownMeta.vue';

const props = defineProps<{
  window: ModalWindow
}>();

const windowContent = computed(() =>
  props.window.content as ModalWindowContentMarkdown,
);

const { file } = useDriveFile(toRef(() => props.window.id));

const permissions = computed(() => ({
  canEdit: file.value?.capabilities?.canEdit,
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

      <WindowContainerMarkdownMeta
        :content="windowContent"
        :file="file"
      />
    </div>
    <div class="window-container-markdown__content mb">
      <va-scroll-container
        vertical
      >
        <WindowContainerMarkdownContent
          v-show="!window.content.editing"
          :window="window"
        />

        <WindowContainerMarkdownForm
          v-show="window.content.editing"
          :window="window"
        />
      </va-scroll-container>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
