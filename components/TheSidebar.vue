<script setup lang="ts">
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
  dynamicPanelStore.open(DynamicPanelModelTypes.RIGHT, DynamicPanelContentTypes.WIDGETS);
  dynamicPanelStore.open(DynamicPanelModelTypes.LEFT, DynamicPanelContentTypes.WIDGETS);
};

const openLayers = () => {
  dynamicPanelStore.open(DynamicPanelModelTypes.LEFT, DynamicPanelContentTypes.LAYERS);
};

const canvasToolStore = useCanvasToolStore();
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
            <va-icon name="splitscreen" rotation="90" size="large" color="primary" />
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
  </va-sidebar>
</template>

<style scoped lang="scss">

</style>
