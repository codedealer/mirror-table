<script setup lang="ts">
import DriveDirectoryTree from '~/components/DriveDirectoryTree.vue';

const userStore = useUserStore();
const sideBarMinimized = ref(false);
</script>

<template>
  <div class="right-panel ghost-container">
    <va-sidebar :minimized="sideBarMinimized" minimized-width="0">
      <va-sidebar-item class="profile-item" hover-color="background-secondary">
        <va-sidebar-item-content>
          <va-avatar
            :src="userStore.user?.photoURL ?? ''"
            :alt="userStore.user?.displayName ?? ''"
            size="small"
          />
          <va-sidebar-item-title>
            {{ userStore.user?.displayName ?? '' }}
          </va-sidebar-item-title>
        </va-sidebar-item-content>
      </va-sidebar-item>

      <DriveDirectoryTree />
    </va-sidebar>
  </div>
</template>

<style scoped lang="scss">

</style>
