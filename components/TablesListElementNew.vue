<script setup lang="ts">
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const showModal = ref(false);
const title = ref('');
const fileId = ref('');
const { file, error, isLoading } = useDriveFile(fileId);
const isBusy = ref(false);

const cancel = () => {
  showModal.value = false;
};

const reset = () => {
  title.value = '';
  fileId.value = '';
};

const submit = async () => {
  const notificationStore = useNotificationStore();

  try {
    isBusy.value = true;

    const tableStore = useTableStore();
    await tableStore.create(title.value, file.value);

    notificationStore.success('Table created successfully');
    reset();
    cancel();
  } catch (e) {
    notificationStore.error(extractErrorMessage(e));
  } finally {
    isBusy.value = false;
  }
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
          const pickedFile = result.docs[0];
          fileId.value = pickedFile.id;
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
            :min-length="1"
            :max-length="80"
            counter
            required
          />

          <div class="vertical-form__image">
            <DriveThumbnail
              :file="file"
              :error="error"
              :file-is-loading="isLoading"
              width="300"
              height="150"
              removable
              @error="console.log"
              @remove="fileId = ''"
            />
            <p>
              You can upload a custom image for your table. This image will be used in the table's card view. Keep the aspect ratio to 2:1 and width to no less than 300px for optimal experience.
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
          <div class="vertical-form__actions">
            <va-button
              preset="plain"
              color="secondary-dark"
              @click="cancel"
            >
              Cancel
            </va-button>
            <va-button
              preset="outlined"
              type="submit"
              :loading="isBusy"
            >
              Create
            </va-button>
          </div>
        </va-form>
      </va-modal>
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss">

</style>
