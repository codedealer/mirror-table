<script setup lang="ts">
withDefaults(defineProps<{
  disabled: boolean
}>(), {
  disabled: false,
});

defineEmits<{
  'update:dirty': void
}>();

const showTitle = defineModel<boolean>('showTitle', {
  required: true,
});

const title = defineModel<string>('title', {
  required: true,
});
</script>

<template>
  <div
    class="horizontal-control"
  >
    <va-checkbox
      v-model="showTitle"
      name="show"
      label="Show title"
      color="primary-dark"
      :disabled="disabled"
      @update:dirty="$emit('update:dirty')"
    />

    <va-input
      v-show="showTitle"
      v-model="title"
      name="display-title"
      label="Display Title"
      :max-length="100"
      counter
      :disabled="disabled"
      @update:dirty="$emit('update:dirty')"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
