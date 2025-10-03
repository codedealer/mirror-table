<script setup lang="ts">
import type { ContextAction } from '~/models/types';

const props = withDefaults(defineProps<{
  actions: ContextAction[];
  icon?: string;
  openedIcon?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  preset?: string;
}>(), {
  icon: 'more_vert',
  openedIcon: 'more_vert',
  color: 'primary-dark',
  size: 'medium',
  preset: 'plain',
});

const dropdownModel = defineModel<boolean>('dropdown', {
  required: false,
});

const pinnedActions = computed(() => props.actions.filter(action => action.pinned));
</script>

<template>
  <div
    v-show="actions.length"
    class="context-panel flex gap-05"
  >
    <va-button
      v-for="action in pinnedActions"
      :key="action.id"
      :disabled="action.disabled"
      :color="action.icon?.color ?? 'primary-dark'"
      :icon="action.icon?.name"
      :preset="preset"
      :size="size"
      :class="action.alwaysVisible ? '' : 'context-panel__action--hiding'"
      :title="action.label"
      @click.stop="action.action"
    />

    <va-button-dropdown
      v-model="dropdownModel"
      :icon="icon"
      :opened-icon="openedIcon"
      :preset="preset"
      :color="color"
      :size="size"
      stick-to-edges
      @click.stop
    >
      <va-list class="drive-node__context-menu">
        <va-list-item
          v-for="action in actions"
          :key="action.id"
          :disabled="action.disabled"
          href="#"
          @click="action.action"
        >
          <va-list-item-section icon>
            <va-icon
              v-if="action.icon"
              :name="action.icon.name"
              :color="action.icon?.color ?? 'primary-dark'"
              size="small"
            />
          </va-list-item-section>
          <va-list-item-section>
            <va-list-item-label caption>
              {{ action.label }}
            </va-list-item-label>
          </va-list-item-section>
        </va-list-item>
      </va-list>
    </va-button-dropdown>
  </div>
</template>

<style scoped lang="scss">

</style>
