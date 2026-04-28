<script setup lang="ts">
import { SelectionGroupNames, SelectionGroups } from '~/models/types';

const rightPanelStore = useRightPanelStore();
const { isSettingsModalVisible } = storeToRefs(rightPanelStore);

const dynamicPanelStore = useDynamicPanelStore();
const layersStore = useLayersStore();

const panelOptions: { label: string; type: DynamicPanelContentType }[] = [
  { label: 'Scenes', type: DynamicPanelContentTypes.EXPLORER },
  { label: 'Sessions', type: DynamicPanelContentTypes.SESSIONS },
  { label: 'Layers', type: DynamicPanelContentTypes.LAYERS },
  { label: 'Panels', type: DynamicPanelContentTypes.WIDGETS },
];

const selectionGroupOptions = Object.entries(SelectionGroupNames) as [string, string][];
</script>

<template>
  <va-modal
    v-model="isSettingsModalVisible"
    title="Settings"
    close-button
    hide-default-actions
  >
    <va-card outlined>
      <va-card-content>
        <h3 class="settings-section-title">
          Panel behaviour
        </h3>
        <p class="settings-section-description">
          Pinned panels stay open; unpinned panels close on click outside.
        </p>
        <div
          v-for="panel in panelOptions"
          :key="panel.type"
          class="settings-row"
        >
          <span class="settings-label">{{ panel.label }}</span>
          <va-button
            preset="plain"
            :color="dynamicPanelStore.isPinned(panel.type) ? 'primary' : 'secondary'"
            :title="dynamicPanelStore.isPinned(panel.type) ? 'Unpin panel' : 'Pin panel'"
            @click="dynamicPanelStore.togglePin(panel.type)"
          >
            <va-icon
              name="push_pin"
              :class="{ 'pin-inactive': !dynamicPanelStore.isPinned(panel.type) }"
              size="medium"
            />
          </va-button>
        </div>

        <va-divider class="settings-divider" />

        <h3 class="settings-section-title">
          Layer visibility
        </h3>
        <p class="settings-section-description">
          Controls which selection groups are active in the Layers panel.
        </p>
        <div
          v-for="[group, name] in selectionGroupOptions"
          :key="group"
          class="settings-row"
        >
          <span class="settings-label">{{ name }}</span>
          <va-switch
            :model-value="layersStore.activeGroups[Number(group) as SelectionGroup] ?? true"
            :disabled="Number(group) === SelectionGroups.SCREEN"
            size="small"
            @update:model-value="layersStore.toggleGroup(Number(group) as SelectionGroup)"
          />
        </div>
      </va-card-content>
    </va-card>
  </va-modal>
</template>

<style scoped lang="scss">
.settings-section-title {
  font-size: 1.1rem;
  font-weight: 400;
  padding-bottom: 3px;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid var(--va-background-border);
}

.settings-section-description {
  font-size: 0.85rem;
  color: var(--va-secondary);
  margin-bottom: 0.75rem;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.settings-label {
  font-size: 0.95rem;
}

.settings-divider {
  margin: 1rem 0;
}

.pin-inactive {
  transform: rotate(45deg);
  opacity: 0.6;
}
</style>
