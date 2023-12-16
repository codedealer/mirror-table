<script setup lang="ts">
const userStore = useUserStore();
const layoutStore = useLayoutStore();

watchEffect(() => {
  if (!userStore.isLoggedIn) {
    return navigateTo('/');
  }
});
</script>

<template>
  <div class="main-grid">
    <div class="main-grid__content">
      <slot />
    </div>
    <div class="main-grid__left">
      <TheSidebar
        v-if="layoutStore.toolbarEnabled"
      />

      <DynamicPanel name="left" />
    </div>
    <div class="main-grid__right">
      <TheRightPanel v-if="layoutStore.rightPanelEnabled" />

      <DynamicPanel name="right" />
    </div>
    <div class="main-grid__status">
      <TheWindowManager />

      <ClientOnly>
        <TheDriveParentModal />
        <TheNotifications />
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
