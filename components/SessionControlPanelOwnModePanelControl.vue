<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';
import type { DynamicPanelModelType } from '~/models/types';

const tableStore = useTableStore();

const toggleTablePanelState = (type: DynamicPanelModelType) => {
  if (!tableStore.table) {
    return;
  }

  tableStore.togglePanelsState({
    [type]: !tableStore.table.panels[type],
  });
};

const dynamicPanelStore = useDynamicPanelStore();

const togglePanelLocal = (type: DynamicPanelModelType) => {
  dynamicPanelStore.open(type, DynamicPanelContentTypes.WIDGETS);
};

onKeyStroke(true, (e) => {
  if (e.target && isEditableElement(e.target)) {
    return;
  }

  e.preventDefault();

  if (e.code === 'KeyE') {
    if (!e.shiftKey) {
      togglePanelLocal(DynamicPanelModelTypes.RIGHT);
    } else {
      toggleTablePanelState(DynamicPanelModelTypes.RIGHT);
    }
  } else if (e.code === 'KeyQ') {
    if (!e.shiftKey) {
      togglePanelLocal(DynamicPanelModelTypes.LEFT);
    } else {
      toggleTablePanelState(DynamicPanelModelTypes.LEFT);
    }
  }
});
const hotkeyStore = useHotkeyStore();
hotkeyStore.registerHotkey({
  id: 'toggle-left-panel',
  key: 'Q',
  modifiers: { shift: true },
  description: 'Show left panel to viewers',
  namespace: 'Widget panels',
});
hotkeyStore.registerHotkey({
  id: 'toggle-right-panel',
  key: 'E',
  modifiers: { shift: true },
  description: 'Show right panel to viewers',
  namespace: 'Widget panels',
});
hotkeyStore.registerHotkey({
  id: 'open-left-panel',
  key: 'Q',
  modifiers: {},
  description: 'Open left widget panel',
  namespace: 'Widget panels',
});
hotkeyStore.registerHotkey({
  id: 'open-right-panel',
  key: 'E',
  modifiers: {},
  description: 'Open right widget panel',
  namespace: 'Widget panels',
});
</script>

<template>
  <va-card-block
    horizontal
  >
    <va-card-content class="flex gap-05">
      <div class="flex gap-05">
        <va-button-group preset="primary">
          <va-popover :hover-over-timeout="1000" message="Show left panel to viewers">
            <va-button
              class="dynamic-panel-button"
              @click="toggleTablePanelState(DynamicPanelModelTypes.LEFT)"
            >
              <DynamicPanelIcon :type="DynamicPanelModelTypes.LEFT" />
            </va-button>
          </va-popover>
          <va-popover :hover-over-timeout="1000" message="Show right panel to viewers">
            <va-button
              class="dynamic-panel-button"
              @click="toggleTablePanelState(DynamicPanelModelTypes.RIGHT)"
            >
              <DynamicPanelIcon :type="DynamicPanelModelTypes.RIGHT" />
            </va-button>
          </va-popover>
        </va-button-group>
      </div>
      <div class="flex gap-05">
        <va-button-group preset="primary">
          <va-popover :hover-over-timeout="1000" message="Open left widget panel">
            <va-button
              color="secondary"
              class="dynamic-panel-button"
              @click="togglePanelLocal(DynamicPanelModelTypes.LEFT)"
            >
              <DynamicPanelIcon :type="DynamicPanelModelTypes.LEFT" />
            </va-button>
          </va-popover>
          <va-popover :hover-over-timeout="1000" message="Open right widget panel">
            <va-button
              color="secondary"
              class="dynamic-panel-button"
              @click="togglePanelLocal(DynamicPanelModelTypes.RIGHT)"
            >
              <DynamicPanelIcon :type="DynamicPanelModelTypes.RIGHT" />
            </va-button>
          </va-popover>
        </va-button-group>
      </div>
    </va-card-content>
  </va-card-block>
</template>

<style lang="scss">
.dynamic-panel-button {
  .va-button__content {
    --va-button-content-px: 0.5rem;
    padding-left: 0;
  }

  &:first-child .va-button__content {
    padding-right: 0;
    padding-left: var(--va-button-content-px);
  }
}
</style>
