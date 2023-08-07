<template>
  <div class="page-wrapper">
    <TheNavigation />

    <slot />

    <ClientOnly>
      <TheDriveParentModal />
    </ClientOnly>
  </div>
</template>
