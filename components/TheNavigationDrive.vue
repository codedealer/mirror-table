<script setup lang="ts">
const driveButtonDisabled = ref(true);
useDrive();
</script>

<template>
  <va-popover
    message="Google Drive Link"
  >
    <va-button
      icon="cloud"
      preset="plain"
      color="primary-dark"
      size="large"
      :disabled="driveButtonDisabled"
    />
  </va-popover>
</template>

<style scoped lang="scss">

</style>
