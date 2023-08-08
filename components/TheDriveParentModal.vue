<script setup lang="ts">
const config = useRuntimeConfig();
const driveModalStore = useDriveFolderModalStore();
const { parentFolderModalModel } = toRefs(driveModalStore);

const onOk = () => {
  driveModalStore.resolve(config.public.parentFolder);
};

const onCancel = () => {
  driveModalStore.reject(config.public.rootFolder);
};
</script>

<template>
  <va-modal
    v-model="parentFolderModalModel"
    ok-text="Create workspace folder"
    cancel-text="Continue to work in root folder"
    z-index="1500"
    class="top-tier-modal"
    @cancel="onCancel"
    @ok="onOk"
  >
    <h2 class="va-h2">
      Create workspace folder?
    </h2>
    <p>The best user experience with this app is achieved when you work from a workspace folder within your Google Drive. This way ensures that there is no problems with thumbnail display and permission mismatch. The folder will be named <b>{{ config.public.parentFolder }}</b></p>
    <p>However, it is not necessary for the app to function. You can proceed to work directly into your root Drive folder.</p>
  </va-modal>
</template>

<style scoped lang="scss">

</style>
