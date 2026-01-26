<script setup lang="ts">
const canvasContextPanelStore = useCanvasContextPanelStore();

const alignmentOptions = [
  { value: 'left', icon: 'format_align_left' },
  { value: 'center', icon: 'format_align_center' },
  { value: 'right', icon: 'format_align_right' },
] as const;

const fontSizeMin = 10;
const fontSizeMax = 72;
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

      <div class="text-formatting">
        <div class="text-formatting__section">
          <span class="text-formatting__label">Alignment</span>
          <va-button-group>
            <va-button
              v-for="option in alignmentOptions"
              :key="option.value"
              :icon="option.icon"
              :preset="canvasContextPanelStore.textModalContent.align === option.value ? 'primary' : 'secondary'"
              :disabled="canvasContextPanelStore.textModalLoading"
              size="small"
              @click="canvasContextPanelStore.textModalContent.align = option.value"
            />
          </va-button-group>
        </div>

        <div class="text-formatting__section">
          <span class="text-formatting__label">Font Size</span>
          <div class="text-formatting__font-size">
            <va-slider
              v-model="canvasContextPanelStore.textModalContent.fontSize"
              :min="fontSizeMin"
              :max="fontSizeMax"
              :disabled="canvasContextPanelStore.textModalLoading"
              track-label-visible
            />
            <va-input
              v-model.number="canvasContextPanelStore.textModalContent.fontSize"
              type="number"
              :min="fontSizeMin"
              :max="fontSizeMax"
              :disabled="canvasContextPanelStore.textModalLoading"
              class="input-sm"
            />
          </div>
        </div>

        <div class="text-formatting__colors">
          <div class="text-formatting__section">
            <span class="text-formatting__label">Text Color</span>
            <va-color-input
              v-model="canvasContextPanelStore.textModalContent.fill"
              :disabled="canvasContextPanelStore.textModalLoading"
            />
          </div>

          <div class="text-formatting__section">
            <span class="text-formatting__label">Background</span>
            <va-color-input
              v-model="canvasContextPanelStore.textModalContent.backgroundColor"
              :disabled="canvasContextPanelStore.textModalLoading"
            />
          </div>
        </div>
      </div>

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
.text-formatting {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--va-text-primary);
  }

  &__font-size {
    display: flex;
    align-items: center;
    gap: 1rem;

    .va-slider {
      flex: 1;
    }
  }

  &__colors {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}
</style>
