<script setup lang="ts">
import type { DriveFile } from '~/models/types';
import { onKeyStroke, useDebounceFn } from '@vueuse/core';

const driveStore = useDriveStore();
const driveSearchStore = useDriveSearchStore();
const driveFileStore = useDriveFileStore();

const { searchModalState: state, searchModalMode: mode, recentSelected } = storeToRefs(driveSearchStore);

const search = ref('');
const selectedFile = ref<DriveFile>();
const loading = ref(false);

const getFileContextActions = (file: DriveFile) => {
  if (!file) {
    return [];
  }

  if (isDriveAsset(file)) {
    return AssetContextActionsFactory(file);
  }
  if (isDriveWidget(file)) {
    return WidgetContextActionsFactory(file);
  }

  return [];
};

const result = ref<DriveFile[]>([]);
const selectorOptions = computed(() => {
  if (!driveStore.isReady) {
    return [];
  }

  if (!search.value) {
    return recentSelected.value;
  }

  return result.value;
});

const modalTitle = computed(() => {
  if (mode.value === 'assets') {
    return 'Search assets';
  } else if (mode.value === 'widgets') {
    return 'Search widgets';
  }

  return 'Search files';
});

const searchFn = useDebounceFn(async (value: string) => {
  if (!driveStore.isReady || value.length < 3) {
    result.value = [];
    return;
  }

  loading.value = true;

  const type = mode.value !== 'widgets' ? AppPropertiesTypes.ASSET : AppPropertiesTypes.WIDGET;
  if (mode.value === 'assets') {
    result.value = await driveFileStore.search(value, type, AssetPropertiesKinds.COMPLEX);
  } else {
    result.value = await driveFileStore.search(value, type);
  }

  loading.value = false;
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
    driveSearchStore.addRecentSelected(selectedFile.value);
    reset();
    state.value = false;
  }
});

const hotkeyStore = useHotkeyStore();
hotkeyStore.registerHotkey({
  id: 'drive-search-all',
  key: 'F',
  modifiers: { shift: true },
  description: 'Search for files',
  namespace: 'Global',
});
hotkeyStore.registerHotkey({
  id: 'drive-search-assets',
  key: 'A',
  modifiers: { shift: true },
  description: 'Search for assets',
  namespace: 'Global',
});
hotkeyStore.registerHotkey({
  id: 'drive-search-widgets',
  key: 'W',
  modifiers: { shift: true },
  description: 'Search for widgets',
  namespace: 'Global',
});
onKeyStroke(true, (e) => {
  if (
    !driveStore.isReady
    || (e.code !== 'KeyF' && e.code !== 'KeyA' && e.code !== 'KeyW')
    || !e.shiftKey
    || (e.target && isEditableElement(e.target))
  ) {
    return;
  }

  e.preventDefault();

  if (state.value) {
    state.value = false;
  } else {
    const mode = e.code === 'KeyA' ? 'assets' : e.code === 'KeyW' ? 'widgets' : 'all';
    driveSearchStore.showSearchModal(mode);
  }
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
      <va-card-title>
        <va-icon name="search" />
        {{ modalTitle }}
      </va-card-title>
      <va-card-content>
        <div class="mb">
          <va-button-group
            preset="primary"
            size="small"
          >
            <va-button
              :color="mode === 'all' ? 'primary' : 'primary-dark'"
              @click="mode = 'all'"
            >
              Files
            </va-button>
            <va-button
              :color="mode === 'assets' ? 'primary' : 'primary-dark'"
              @click="mode = 'assets'"
            >
              Assets
            </va-button>
            <va-button
              :color="mode === 'widgets' ? 'primary' : 'primary-dark'"
              @click="mode = 'widgets'"
            >
              Widgets
            </va-button>
          </va-button-group>
        </div>
        <ItemSelector
          v-model="search"
          v-model:selected="selectedFile"
          :options="selectorOptions"
          :loading="loading"
          :placeholder="modalTitle"
          autofocus
        >
          <template #header>
            <div v-if="!search && recentSelected.length > 0" class="mb-05 text-secondary">
              Recent files
            </div>
            <div v-else-if="search.length > 0 && result.length > 0" class="mb-05 text-secondary">
              Search results
            </div>
          </template>

          <template #default="{ option }">
            <va-list-item-section>
              <va-list-item-label caption>
                {{ stripFileExtension(option.name) }}
              </va-list-item-label>
            </va-list-item-section>

            <va-list-item-section icon class="selector-actions">
              <ContextPanel
                :actions="getFileContextActions(option)"
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
