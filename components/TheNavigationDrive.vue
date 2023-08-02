<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core';

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
    .addView(new google.picker.DocsUploadView())
    .setOAuthToken(authInfo.accessToken)
    .setDeveloperKey(config.public.fbApiKey)
    .setAppId(config.public.clientId)
    .setCallback(async (data) => {
      if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        console.log('The user selected: ', doc);
        // get the file info
        const file = await driveStore.client!.drive.files.get({
          fileId: doc.id,
          fields: '*',
          alt: 'media',
        });
        console.log('file info: ', file);
        const binaryData = file.body;
        const arr = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          arr[i] = binaryData.charCodeAt(i);
        }
        const blobUrl = useObjectUrl(new Blob([arr], {
          type: file.headers ? file.headers['Content-Type'] : 'application/octet-stream',
        }));
        userStore.img = blobUrl.value;
      }
    })
    .build();
  picker.setVisible(true);
};
</script>

<template>
  <va-popover
    message="Open Google Drive Pop up"
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
