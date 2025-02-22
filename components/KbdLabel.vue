<script setup lang="ts">
withDefaults(defineProps<{
  button: string | number
  modifiers?: string[]
  size?: 'small' | 'large'
}>(), {
  modifiers: () => [] as string[],
  size: 'small',
});
</script>

<template>
  <kbd class="kbd-label" :class="size">
    <template
      v-for="modifier in modifiers"
      :key="modifier"
    >
      <kbd
        class="kbd-label__modifier"
      >
        {{ modifier }}
      </kbd>
      <span>+</span>
    </template>
    <kbd class="kbd-label__key">{{ button }}</kbd>
  </kbd>
</template>

<style lang="scss">
.kbd-label {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  padding: 0.25rem 0.25rem;
  border-radius: 0.25rem;
  background-color: var(--va-background-element);
  border: 1px solid color-mix(in oklab, var(--va-background-element) 70%, #fff 30%);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  text-transform: uppercase;
  user-select: none;
  white-space: nowrap;
  cursor: default;
  font-variant-numeric: tabular-nums;
  gap: 3px;

  .kbd-label__modifier {
    font-size: 70%;
  }

  .kbd-label__key {
    font-weight: 600;
  }

  &.large {
    font-size: 1rem;
    padding: 0.5rem 0.5rem;
  }
}
</style>
