<script setup lang="ts">
const canvasContextPanelStore = useCanvasContextPanelStore();
</script>

<template>
  <va-modal
    v-model="canvasContextPanelStore.modalState"
    hide-default-actions
    size="small"
    @cancel="canvasContextPanelStore.hide"
  >
    <va-form
      tag="form"
      class="vertical-form table-form"
      @submit.prevent="canvasContextPanelStore.modalSubmit"
    >
      <AppPropertiesTitleForm
        v-model:show-title="canvasContextPanelStore.modalContent.showTitle"
        v-model:title="canvasContextPanelStore.modalContent.title"
        :disabled="canvasContextPanelStore.modalLoading"
      />

      <div class="vertical-form__actions">
        <va-button
          preset="plain"
          color="secondary-dark"
          @click="canvasContextPanelStore.modalHide"
        >
          Cancel
        </va-button>
        <va-button
          preset="outlined"
          type="submit"
          :loading="canvasContextPanelStore.modalLoading"
        >
          Create
        </va-button>
      </div>
    </va-form>
  </va-modal>
</template>

<style scoped lang="scss">

</style>
