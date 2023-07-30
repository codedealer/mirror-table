<script setup lang="ts">
const config = useRuntimeConfig();
const userStore = useUserStore();
const { authorizationInfo } = toRefs(userStore);
const { client } = useGoogleIdentityService('implicitGrantFlow', {
  clientId: config.public.clientId,
  storage: authorizationInfo,
});

const driveStore = useDriveStore();
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
      :loading="driveStore.isLoading"
      :disabled="!driveStore.isReady"
    />
  </va-popover>
</template>

<style scoped lang="scss">

</style>
