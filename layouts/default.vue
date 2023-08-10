<template>
  <div class="page-wrapper">
    <TheNavigation />

    <slot />

    <ClientOnly>
      <TheDriveParentModal />
      <TheNotifications />
    </ClientOnly>
  </div>
</template>
