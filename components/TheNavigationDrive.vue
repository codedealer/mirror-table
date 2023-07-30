<script setup lang="ts">
const config = useRuntimeConfig();
const userStore = useUserStore();
const { authorizationInfo } = toRefs(userStore);
const { client } = useGoogleIdentityService('implicitGrantFlow', {
  clientId: config.public.clientId,
  storage: authorizationInfo,
});

const driveStore = useDriveStore();

const getDriveData = async () => {
  const authInfo = await client.value?.requestToken({
    prompt: '',
    hint: 'work.mello@gmail.com',
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
