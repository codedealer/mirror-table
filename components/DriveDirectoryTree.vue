<script setup lang="ts">
import { Fold, Tree as NakedTree } from 'he-tree-vue';
import { extractErrorMessage } from '~/utils/extractErrorMessage';
import { DriveDirectoryTreeFile, DriveDirectoryTreeFolder } from '#components';

const Tree = NakedTree.mixPlugins([
  Fold,
]);
const driveStore = useDriveStore();
const userStore = useUserStore();

const { loading, nodes } = useDriveFileTree();

const showPicker = async () => {
  const { buildPicker } = usePicker();
  try {
    await buildPicker({
      parentId: userStore.profile!.settings.driveFolderId,
      template: 'all',
      allowUpload: false,
      callback: async (result) => {
        console.log('picker callback: ', result);
        if (result.action === google.picker.Action.PICKED) {
          const pickedFile = result.docs[0];
          const client = await driveStore.getClient();
          const fileResponse = await client.drive.files.get({
            fileId: pickedFile.id,
            fields: 'id, trashed, name, originalFilename, mimeType, shared, isAppAuthorized, imageMediaMetadata, createdTime, modifiedTime, fileExtension, properties, appProperties, md5Checksum, version, videoMediaMetadata, thumbnailLink, permissionIds, size, quotaBytesUsed, capabilities',
          });

          console.log('fileResponse: ', fileResponse);
        }
      },
    });
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  }
};

const newFile = shallowRef<FormData | null>(null);
const headers = computed(() => {
  if (!userStore.isAuthenticated) {
    return;
  }
  return {
    Authorization: `Bearer ${userStore.authorizationInfo.accessToken}`,
  };
});

const { data, error, execute, status } = useFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
  method: 'POST',
  headers,
  body: newFile,
  immediate: false,
  watch: false,
});

const uploadFile = async () => {
  const content = '# This is a sample Markdown file\n\nHello World!';
  const blob = new Blob([content], { type: 'text/markdown' });
  const metadata = {
    name: `sample${Math.round(Math.random() * 100)}.md`,
    mimeType: 'text/markdown',
    parents: [
      userStore.profile!.settings.driveFolderId,
    ],
    appProperties: {
      type: 'asset',
    },
  };
  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });

  const form = new FormData();
  form.append('metadata', metadataBlob);
  form.append('file', blob);

  newFile.value = form;

  try {
    const googleStore = useGoogleAuthStore();
    await googleStore.client!.requestToken();

    await execute();
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  }
};
</script>

<template>
  <div class="ghost-container">
    <va-sidebar-item>
      <va-sidebar-item-content>
        <va-popover
          message="Upload to Google Drive"
        >
          <va-button
            icon="cloud"
            preset="plain"
            color="primary"
            size="medium"
            :loading="driveStore.isLoading"
            :disabled="!driveStore.isReady || !userStore.isAuthenticated"
            @click="showPicker"
          />
        </va-popover>
        <va-sidebar-item-title />
        <va-popover
          message="Create new asset"
          placement="bottom-left"
        >
          <va-button
            icon="library_add"
            preset="plain"
            color="primary"
            size="medium"
            :loading="driveStore.isLoading || status === 'pending'"
            :disabled="!driveStore.isReady || !userStore.isAuthenticated"
            @click="uploadFile"
          />
        </va-popover>
      </va-sidebar-item-content>
    </va-sidebar-item>

    <Tree
      :value="nodes"
      folding-transition-name="slide-fade"
    >
      <template #default="{ node, index, path, tree }">
        <component
          :is="node.isFolder ? DriveDirectoryTreeFolder : DriveDirectoryTreeFile"
          :node="node"
          :index="index"
          :path="path"
          :tree="tree"
        />
      </template>
    </Tree>
  </div>
</template>

<style scoped lang="scss">

</style>
