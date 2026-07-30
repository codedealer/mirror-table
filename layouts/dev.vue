<script setup lang="ts">
const goToDashboard = () => navigateTo('/dashboard');
</script>

<template>
  <div class="dev-layout">
    <VaSidebar class="dev-layout__sidebar">
      <VaSidebarItem>
        <VaSidebarItemContent>
          <img src="/logo.svg" alt="Mirror Table" width="32" height="32">
          <VaSidebarItemTitle>Prototype Lab</VaSidebarItemTitle>
        </VaSidebarItemContent>
      </VaSidebarItem>

      <VaDivider />

      <VaSidebarItem @click="goToDashboard">
        <VaSidebarItemContent>
          <VaIcon name="dashboard" color="primary" />
          <VaSidebarItemTitle>Dashboard</VaSidebarItemTitle>
        </VaSidebarItemContent>
      </VaSidebarItem>

      <VaDivider />

      <slot name="navigation" />
    </VaSidebar>

    <div class="dev-layout__main">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.dev-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 16rem minmax(0, 1fr);
}

.dev-layout__sidebar {
  --va-sidebar-item-content-padding: 1rem;
}

.dev-layout__main {
  min-width: 0;
  padding: 2rem;
}

@media (max-width: 700px) {
  .dev-layout {
    grid-template-columns: 1fr;
  }

  .dev-layout__sidebar {
    width: 100%;
  }
}
</style>
