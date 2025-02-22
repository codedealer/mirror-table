<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';
import DriveDirectoryTree from '~/components/DriveDirectoryTree.vue';

const userStore = useUserStore();
const rightPanelStore = useRightPanelStore();
const { sideBarMinimized } = storeToRefs(rightPanelStore);

onKeyStroke(true, (e) => {
  if (e.target && isEditableElement(e.target)) {
    return;
  }

  e.preventDefault();
  if (e.code === 'KeyR') {
    sideBarMinimized.value = !sideBarMinimized.value;
  }
});
</script>

<template>
  <div class="right-panel ghost-container">
    <va-sidebar
      :minimized="sideBarMinimized"
      class="screen-height"
      minimized-width="0"
    >
      <va-sidebar-item class="profile-item" hover-color="background-secondary">
        <va-sidebar-item-content>
          <va-avatar
            :src="userStore.user?.photoURL ?? ''"
            :alt="userStore.user?.displayName ?? ''"
            size="small"
          />
          <va-sidebar-item-title class="text-overflow">
            {{ userStore.user?.displayName ?? '' }}
          </va-sidebar-item-title>
          <va-button
            icon="chevron_right"
            size="large"
            preset="plain"
            color="primary-dark"
            @click="sideBarMinimized = true"
          />
        </va-sidebar-item-content>
      </va-sidebar-item>

      <DriveDirectoryTree v-show="!sideBarMinimized" />

      <DriveDirectorySearch />
    </va-sidebar>

    <div
      v-show="sideBarMinimized"
      class="right-panel-flying-container"
    >
      <va-button
        icon="chevron_left"
        size="large"
        preset="plain"
        color="primary-dark"
        @click="sideBarMinimized = false"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
