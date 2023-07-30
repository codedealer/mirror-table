<script setup lang="ts">
const config = useRuntimeConfig();
const userStore = useUserStore();
const { authorizationInfo, userProfile } = toRefs(userStore);
const { client } = useGoogleIdentityService('implicitGrantFlow', {
  clientId: config.public.clientId,
  storage: authorizationInfo,
});

const driveStore = useDriveStore();

const getDriveData = async () => {
  if (userProfile.value === null || !userProfile.value.email) {
    return;
  }

  const authInfo = await client.value?.requestToken({
    prompt: '',
    hint: userProfile.value.email,
  });
  console.log('got token: ', authInfo?.accessToken);
  if (!driveStore.client || !authInfo) {
    return;
  }
  driveStore.client.setToken({
    access_token: authInfo.accessToken,
  });
  driveStore.client.drive.files.list({
    pageSize: 10,
    fields: 'files(id, name)',
  }).then((res) => {
    console.log('got drive files: ', res.result);
  });
};
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
      @click="getDriveData"
    />
  </va-popover>
</template>

<style scoped lang="scss">

</style>
