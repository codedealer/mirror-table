<script setup lang="ts">

</script>

<template>
  <va-sidebar minimized minimized-width="48px" class="centered-icons">
    <va-sidebar-item>
      <va-sidebar-item-content>
        <va-popover message="Back to Dashboard" placement="right">
          <va-button
            tag="NuxtLink"
            to="/dashboard"
            preset="plain"
          >
            <img src="/logo.png" alt="logo" width="32" height="32">
          </va-button>
        </va-popover>
        <va-sidebar-item-title>Back to Dashboard</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>
    <va-divider />
    <va-sidebar-item>
      <va-sidebar-item-content>
        <va-popover message="Scenes" placement="right">
          <va-button
            icon="map"
            size="medium"
            preset="plain"
          />
        </va-popover>
        <va-sidebar-item-title>Scenes</va-sidebar-item-title>
      </va-sidebar-item-content>
    </va-sidebar-item>
  </va-sidebar>
</template>

<style scoped lang="scss">

</style>
