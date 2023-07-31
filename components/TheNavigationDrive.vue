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

  // show the picker
  const picker = new window.google.picker.PickerBuilder()
    .addView(google.picker.ViewId.DOCS)
    .setOAuthToken(authInfo.accessToken)
    .setDeveloperKey(config.public.fbApiKey)
    .setCallback((data) => {
      if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        console.log('The user selected: ', doc);
        // driveStore.setFile(doc);
      }
    })
    .build();
  picker.setVisible(true);
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
