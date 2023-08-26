<script setup lang="ts">
const driveTreeStore = useDriveTreeStore();

const { loading, initialized } = toRefs(driveTreeStore);

const setRoot = () => {
  driveTreeStore.setRootFolder();
};
</script>

<template>
  <div class="drive-directory-tree-header">
    <div class="drive-directory-tree-header__content">
      <div class="drive-directory-tree-header__root-nav">
        <va-popover
          message="Go to root"
        >
          <va-button
            preset="plain"
            color="primary"
            size="medium"
            :loading="loading"
            :disabled="!initialized"
            @click="setRoot"
          >
            <div class="drive-node__icon">
              <va-icon
                name=""
                color="primary"
                size="medium"
                class="drive-node__icon root-icon"
              />
            </div>
          </va-button>
        </va-popover>
      </div>
      <div class="drive-directory-tree-header__actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
