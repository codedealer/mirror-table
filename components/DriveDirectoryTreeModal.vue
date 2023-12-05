<script setup lang="ts">
const driveTreeModalStore = useDriveTreeModalStore();
</script>

<template>
  <va-modal
    v-model="driveTreeModalStore.modalState"
    hide-default-actions
    size="small"
  >
    <h2 class="va-h2">
      {{ driveTreeModalStore.formTitle }}
    </h2>
    <va-form
      tag="form"
      class="vertical-form table-form"
      @submit.prevent="driveTreeModalStore.createFile"
    >
      <va-input
        v-model="driveTreeModalStore.fileName"
        name="title"
        label="Title"
        :min-length="1"
        :max-length="180"
        counter
        required
        autofocus
      />

      <div class="vertical-form__actions">
        <va-button
          preset="plain"
          color="secondary-dark"
          @click="driveTreeModalStore.hide"
        >
          Cancel
        </va-button>
        <va-button
          preset="outlined"
          type="submit"
          :loading="driveTreeModalStore.loading"
        >
          Create
        </va-button>
      </div>
    </va-form>
  </va-modal>
</template>

<style scoped lang="scss">

</style>
