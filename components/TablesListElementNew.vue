<script setup lang="ts">
import { useForm } from 'vuestic-ui';

const showModal = ref(false);
const imageSrc = ref('');
const { formData } = useForm('new-table-form');

const submit = () => {
  console.log(formData.value);
  showModal.value = false;
};

const config = useRuntimeConfig();
const userStore = useUserStore();
const driveStore = useDriveStore();
const { authorizationInfo, isAuthenticated, user } = toRefs(userStore);
const { client } = useGoogleIdentityService('implicitGrantFlow', {
  clientId: config.public.clientId,
  storage: authorizationInfo,
});

const openPicker = async () => {
  if (!isAuthenticated.value || !user.value || !user.value.email) {
    return;
  }

  const authInfo = await client.value?.requestToken({
    prompt: '',
    hint: user.value.email,
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
    .addView(google.picker.ViewId.DOCS_IMAGES)
    .addView(new google.picker.DocsUploadView())
    .setOAuthToken(authInfo.accessToken)
    .setDeveloperKey(config.public.fbApiKey)
    .setAppId(config.public.clientId)
    .setCallback(async (data) => {
      console.log('picker callback: ', data);
      if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        console.log('The user selected: ', doc);
        // get the file info
        const file = await driveStore.client!.drive.files.get({
          fileId: doc.id,
          fields: '*',
        });
        console.log('file info: ', file);
        imageSrc.value = `https://drive.google.com/thumbnail?sz=w640&id=${doc.id}&authuser=2`;
      }
    })
    .build();
  picker.setVisible(true);
};
</script>

<!-- eslint-disable vue/no-unused-refs -->
<template>
  <div class="ghost-container">
    <va-card-title class="card-header">
      Create new Table
    </va-card-title>
    <va-card-content>
      Here you can create a new Table. Each table can be an RPG campaign, a presentation or anything else you can think of. Tables consist of scenes, which are like slides in a presentation. You can add, edit and delete scenes in the table view. Scenes share assets between them but Tables do not.
    </va-card-content>
    <va-card-actions align="right">
      <va-button
        preset="secondary"
        border-color="primary"
        @click="showModal = true"
      >
        Create Table
      </va-button>
    </va-card-actions>

    <va-modal
      v-model="showModal"
      fullscreen
      ok-text="Create"
      cancel-text="Cancel"
      @ok="submit"
    >
      <h2 class="va-h2">
        New Table
      </h2>
      <va-form
        ref="new-table-form"
        tag="form"
        class="vertical-form table-form"
        @submit.prevent="submit"
      >
        <va-input
          name="tableName"
          label="Table Name"
          required
        />

        <div class="vertical-form__image">
          <img
            v-if="imageSrc"
            :src="imageSrc"
            alt="Table Image"
          >
          <p>
            You can upload a custom image for your table. This image will be used in the table's card view. Keep the aspect ration to 2:1 and width to no less than 300px.
          </p>
          <va-button
            preset="primary"
            color="secondary-dark"
            @click="openPicker"
          >
            Upload Image
          </va-button>
        </div>
      </va-form>
    </va-modal>
  </div>
</template>

<style scoped lang="scss">

</style>
