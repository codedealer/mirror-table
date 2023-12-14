<script setup lang="ts">
const store = useTableExplorerModalStore();
</script>

<template>
  <va-modal
    v-model="store.modalState"
    hide-default-actions
    size="small"
  >
    <h2 class="va-h2">
      {{ store.formTitle }}
    </h2>
    <va-form
      tag="form"
      class="vertical-form table-form"
      @submit.prevent="store.submit"
    >
      <va-input
        v-model="store.title"
        name="title"
        label="Title"
        :min-length="1"
        :max-length="120"
        required
        autofocus
      />

      <div class="vertical-form__actions">
        <va-button
          preset="plain"
          color="secondary-dark"
          @click="store.hide"
        >
          Cancel
        </va-button>
        <va-button
          preset="outlined"
          type="submit"
          :loading="store.loading"
        >
          {{ store.docId ? 'Update' : 'Create' }}
        </va-button>
      </div>
    </va-form>
  </va-modal>
</template>

<style scoped lang="scss">

</style>
