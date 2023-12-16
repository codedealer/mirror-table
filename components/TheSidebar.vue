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
    <va-sidebar-item @click="openExplorer">
      <va-sidebar-item-content>
        <div class="toolbar-button">
          <va-icon name="filter" size="large" color="primary" />

          <span class="toolbar-button__content">Scenes</span>
        </div>
        <va-sidebar-item-title>Scenes</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>
  </va-sidebar>
</template>

<style scoped lang="scss">

</style>
