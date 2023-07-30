<script setup lang="ts">
const driveButtonDisabled = ref(true);

const config = useRuntimeConfig();
const userStore = useUserStore();
const { authorizationInfo } = toRefs(userStore);
const { client } = useGoogleIdentityService('implicitGrantFlow', {
  clientId: config.public.clientId,
  storage: authorizationInfo,
});

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
