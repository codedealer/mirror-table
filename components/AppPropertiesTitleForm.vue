<script setup lang="ts">
withDefaults(defineProps<{
  disabled: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits(['update:dirty']);

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
      @update:dirty="emit('update:dirty', $event)"
    />

    <va-input
      v-show="showTitle"
      v-model="title"
      name="display-title"
      label="Display Title"
      :max-length="100"
      counter
      :disabled="disabled"
      @update:dirty="emit('update:dirty', $event)"
    />
  </div>
</template>

<style scoped lang="scss">

</style>
