<script setup lang="ts">
const userStore = useUserStore();

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
      <TheSidebar />
    </div>
    <div class="main-grid__right">
      <TheRightPanel />
    </div>
    <div class="main-grid__status">
      <div><b>Status bar</b></div>
      <ClientOnly>
        <TheDriveParentModal />
        <TheNotifications />
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
