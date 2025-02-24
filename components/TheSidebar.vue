<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';
import { DynamicPanelContentTypes } from '~/models/types';

const dynamicPanelStore = useDynamicPanelStore();

const openExplorer = () => {
  dynamicPanelStore.open(DynamicPanelModelTypes.LEFT, DynamicPanelContentTypes.EXPLORER);
};

const sessionStore = useSessionStore();

const openSessions = () => {
  dynamicPanelStore.open(DynamicPanelModelTypes.LEFT, DynamicPanelContentTypes.SESSIONS);
};

const tableStore = useTableStore();

const showIndicator = computed(() => {
  if (!tableStore.table) {
    return false;
  }

  return tableStore.table.panels[DynamicPanelModelTypes.RIGHT] || tableStore.table.panels[DynamicPanelModelTypes.LEFT];
});

const openWidgets = () => {
  if (
    dynamicPanelStore.contents[DynamicPanelModelTypes.RIGHT] === DynamicPanelContentTypes.WIDGETS ||
    dynamicPanelStore.contents[DynamicPanelModelTypes.LEFT] === DynamicPanelContentTypes.WIDGETS
  ) {
    dynamicPanelStore.close(DynamicPanelModelTypes.RIGHT);
    dynamicPanelStore.close(DynamicPanelModelTypes.LEFT);
    return;
  }

  dynamicPanelStore.open(DynamicPanelModelTypes.RIGHT, DynamicPanelContentTypes.WIDGETS, true);
  dynamicPanelStore.open(DynamicPanelModelTypes.LEFT, DynamicPanelContentTypes.WIDGETS, true);
};

const openLayers = () => {
  dynamicPanelStore.open(DynamicPanelModelTypes.LEFT, DynamicPanelContentTypes.LAYERS);
};

const canvasToolStore = useCanvasToolStore();
const hotkeyStore = useHotkeyStore();
const toggleHotkeyModal = () => {
  hotkeyStore.isHotkeyModalVisible = !hotkeyStore.isHotkeyModalVisible;
};

onKeyStroke(true, (e) => {
  if (e.target && isEditableElement(e.target)) {
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
    return;
  }

  e.preventDefault();

  if (e.code === 'KeyW') {
    openWidgets();
  } else if (e.code === 'KeyS') {
    openExplorer();
  } else if (e.code === 'KeyL') {
    openLayers();
  } else if (e.code === 'KeyD') {
    openSessions();
  }
});
hotkeyStore.registerHotkey({
  id: 'open-widgets',
  key: 'W',
  description: 'Toggle widget panels',
  modifiers: {},
  namespace: 'Widget panels',
});
hotkeyStore.registerHotkey({
  id: 'open-sessions',
  key: 'D',
  description: 'Toggle session panels',
  modifiers: {},
  namespace: 'Global',
});
hotkeyStore.registerHotkey({
  id: 'open-layers',
  key: 'L',
  description: 'Toggle layers panel',
  modifiers: {},
  namespace: 'Global',
});
hotkeyStore.registerHotkey({
  id: 'open-explorer',
  key: 'S',
  description: 'Toggle scenes panel',
  modifiers: {},
  namespace: 'Global',
});
</script>

<template>
  <va-sidebar minimized minimized-width="48px" class="toolbar centered-icons">
    <va-sidebar-item @click="openSessions">
      <va-sidebar-item-content>
        <va-badge
          overlap
        >
          <div
            :class="{ empty: sessionStore.emptyTable }"
            class="toolbar-button"
          >
            <img src="/logo.png" alt="logo" width="32" height="32">
          </div>
        </va-badge>
        <va-sidebar-item-title>Back to Dashboard</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>

    <va-divider />

    <va-sidebar-item @click="openWidgets">
      <va-sidebar-item-content>
        <div class="toolbar-button">
          <va-badge :dot="showIndicator" overlap>
            <DynamicPanelIcon :type="DynamicPanelModelTypes.LEFT" />
            <DynamicPanelIcon :type="DynamicPanelModelTypes.RIGHT" />
          </va-badge>

          <span class="toolbar-button__content">Panels</span>
        </div>
        <va-sidebar-item-title>Panels</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>

    <va-sidebar-item @click="openExplorer">
      <va-sidebar-item-content>
        <div class="toolbar-button">
          <va-icon name="filter" size="large" color="primary" />

          <span class="toolbar-button__content">Scenes</span>
        </div>
        <va-sidebar-item-title>Scenes</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>

    <va-sidebar-item @click="openLayers">
      <va-sidebar-item-content>
        <div class="toolbar-button">
          <va-icon name="layers" size="large" color="primary" />

          <span class="toolbar-button__content">Layers</span>
        </div>
        <va-sidebar-item-title>Layers</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>

    <va-divider />

    <va-sidebar-item
      v-for="tool in canvasToolStore.tools"
      :key="tool.id"
      :active="canvasToolStore.activeTool?.id === tool.id"
      active-color="#fa45ab20"
      hover-color="primary"
      @click="canvasToolStore.setActiveTool(tool)"
    >
      <va-sidebar-item-content>
        <div class="toolbar-button">
          <va-icon :name="tool.icon" size="large" color="primary" />

          <span class="toolbar-button__content">{{ tool.name }}</span>
        </div>
        <va-sidebar-item-title>{{ tool.name }}</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>

    <va-spacer />

    <va-sidebar-item @click="toggleHotkeyModal">
      <va-sidebar-item-content>
        <va-button
          preset="plain"
          color="secondary-dark"
          icon="keyboard"
          size="large"
        />
      </va-sidebar-item-content>
    </va-sidebar-item>
  </va-sidebar>
</template>

<style scoped lang="scss">

</style>
