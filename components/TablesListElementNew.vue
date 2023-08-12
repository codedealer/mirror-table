<script setup lang="ts">
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const showModal = ref(false);
const title = ref('');
const fileId = ref('');

function submit () {
  console.log('submit');
}

const reset = () => {
  title.value = '';
  fileId.value = '';
};

const cancel = () => {
  showModal.value = false;
};

const userStore = useUserStore();
const googleStore = useGoogleAuthStore();
const { isAuthenticated } = toRefs(userStore);

const openPicker = async () => {
  const { buildPicker } = usePicker();
  try {
    await buildPicker({
      parentId: userStore.profile!.settings.driveFolderId,
      template: 'images',
      allowUpload: true,
      callback: (result) => {
        console.log('picker callback: ', result);
        if (result.action === google.picker.Action.PICKED) {
          const file = result.docs[0];
          fileId.value = file.id;
        }
      },
    });
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  }
  // show the picker
  /* const picker = new window.google.picker.PickerBuilder()
    .addView(google.picker.ViewId.DOCS_IMAGES)
    .addView(new google.picker.DocsUploadView())
    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .setOAuthToken(authorizationInfo.value.accessToken)
    .setDeveloperKey(config.public.fbApiKey)
    .setAppId(config.public.clientId)
    .setCallback(async (data) => {
      console.log('picker callback: ', data);
      if (data.action === google.picker.Action.PICKED) {
        let drive: typeof gapi.client.drive;
        try {
          drive = await driveStore.client!.drive;
        } catch (e) {
          const { init } = useToast();
          init({
            message: typeof e === 'string' ? e : (e as Error).message,
            color: 'danger',
          });
          return;
        }
        // create a batch request to get the file info of all picked files
        const batch = driveStore.client!.newBatch();
        data.docs.forEach((doc: any) => {
          batch.add(drive.files.get({
            fileId: doc.id,
            fields: '*',
          }));
        });
        const batchResponse = await batch;
        console.log('batch response: ', batchResponse);
         const doc = data.docs[0];
        console.log('The user selected: ', doc);
        // get the file info
        const file = await drive.files.get({
          fileId: doc.id,
          fields: '*',
        });
        console.log('file info: ', file);
        imageSrc.value = `https://drive.google.com/thumbnail?sz=w300&id=${doc.id}`;
      }
    })
    .build();
  picker.setVisible(true); */
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
        preset="outlined"
        @click="showModal = true"
      >
        Create Table
      </va-button>
    </va-card-actions>

    <ClientOnly>
      <va-modal
        v-model="showModal"
        fullscreen
        hide-default-actions
        @before-close="reset"
      >
        <h2 class="va-h2">
          New Table
        </h2>
        <va-form
          tag="form"
          class="vertical-form table-form"
          @submit.prevent="submit"
        >
          <va-input
            v-model="title"
            name="title"
            label="Title"
            :rules="[(val) => val && val.length > 0 && val.length < 120 || 'Title should be between 1 and 120 characters long']"
          />

          <div class="vertical-form__image">
            <DriveThumbnail
              :file-id="fileId"
              width="300"
              height="150"
              @error="console.log"
            />
            <p>
              You can upload a custom image for your table. This image will be used in the table's card view. Keep the aspect ration to 2:1 and width to no less than 300px.
            </p>
            <va-button
              preset="primary"
              color="secondary-dark"
              :disabled="!isAuthenticated || !googleStore.client"
              @click="openPicker"
            >
              Upload Image
            </va-button>
          </div>
        </va-form>

        <template #footer>
          <va-button
            preset="plain"
            color="secondary-dark"
            @click="cancel"
          >
            Cancel
          </va-button>
          <va-button
            preset="outlined"
          >
            Create
          </va-button>
        </template>
      </va-modal>
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss">

</style>
