<script setup lang="ts">
const canvasContextPanelStore = useCanvasContextPanelStore();
</script>

<template>
  <va-modal
    v-model="canvasContextPanelStore.textModalState"
    hide-default-actions
    size="medium"
    @cancel="canvasContextPanelStore.textModalHide"
  >
    <va-form
      tag="form"
      class="vertical-form table-form"
      @submit.prevent="canvasContextPanelStore.textModalSubmit"
    >
      <va-textarea
        v-model="canvasContextPanelStore.textModalContent.text"
        label="Text Content"
        :min-rows="5"
        :max-rows="15"
        :disabled="canvasContextPanelStore.textModalLoading"
        autosize
        counter
      />

      <div class="vertical-form__actions">
        <va-button
          preset="plain"
          color="secondary-dark"
          @click="canvasContextPanelStore.textModalHide"
        >
          Cancel
        </va-button>
        <va-button
          preset="outlined"
          type="submit"
          :loading="canvasContextPanelStore.textModalLoading"
        >
          Save
        </va-button>
      </div>
    </va-form>
  </va-modal>
</template>

<style scoped lang="scss">

</style>
