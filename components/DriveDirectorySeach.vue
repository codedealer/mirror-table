<script setup lang="ts">
import { onKeyStroke, useDebounceFn } from '@vueuse/core';
import type { DriveAsset, DriveFile } from '~/models/types';

const driveTreeStore = useDriveTreeStore();
const driveStore = useDriveStore();
const driveFileStore = useDriveFileStore();

const { searchModalState: state } = storeToRefs(driveTreeStore);

const search = ref('');
const selectedFile = ref<DriveFile>();

const result = ref<DriveFile[]>([]);

const searchFn = useDebounceFn(async (value: string) => {
  if (!driveStore.isReady || value.length < 3) {
    result.value = [];
    return;
  }

  result.value = await driveFileStore.search(value);
}, 400, {
  maxWait: 4000,
});

const reset = () => {
  search.value = '';
  selectedFile.value = undefined;
  result.value = [];
};

watch(search, searchFn);

watchEffect(() => {
  if (selectedFile.value) {
    toggleFile(selectedFile.value, selectedFile.value.name);
    reset();
    state.value = false;
  }
});

onKeyStroke(true, (e) => {
  if (
    e.code !== 'KeyF' ||
    !e.shiftKey ||
    (e.target && isEditableElement(e.target))
  ) {
    return;
  }

  e.preventDefault();

  state.value = driveStore.isReady && !state.value;
}, {
  dedupe: true,
});
</script>

<template>
  <va-modal
    v-model="state"
    hide-default-actions
    without-transitions
    no-padding
    size="small"
    @cancel="reset"
  >
    <va-card>
      <va-card-content>
        <ItemSelector
          v-model="search"
          v-model:selected="selectedFile"
          :options="result"
          placeholder="Search files"
          autofocus
        >
          <template #default="{ option }">
            <va-list-item-section>
              <va-list-item-label caption>
                {{ stripFileExtension((option as DriveFile).name) }}
              </va-list-item-label>
            </va-list-item-section>

            <va-list-item-section icon class="selector-actions">
              <ContextPanel
                :actions="AssetContextActionsFactory(option as DriveAsset)"
              />
            </va-list-item-section>
          </template>
        </ItemSelector>
      </va-card-content>
    </va-card>
  </va-modal>
</template>

<style scoped lang="scss">

</style>
