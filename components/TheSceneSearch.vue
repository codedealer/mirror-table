<script setup lang="ts">
import type { Scene } from '~/models/types';
import { collection, getDocs, limit, query, where } from '@firebase/firestore';
import { onKeyStroke, useDebounceFn } from '@vueuse/core';
import ItemSelector from '~/components/ItemSelector.vue';

const selectedScene = ref<Scene>();
const search = ref('');
const loading = ref(false);

const { $db } = useNuxtApp();
const tableStore = useTableStore();
const sceneSearchStore = useSceneSearchStore();

const { searchModalState: state, recentSelected } = storeToRefs(sceneSearchStore);

const result = ref<Scene[]>([]);

const displayResults = computed(() => {
  if (search.value.length > 0) {
    return result.value;
  }

  return recentSelected.value;
});

const searchFn = useDebounceFn(async (value: string) => {
  if (!tableStore.table || value.length < 3) {
    result.value = [];
    return;
  }

  const sceneCollection = collection(
    $db,
    'tables',
    tableStore.table.id,
    'scenes',
  ).withConverter(firestoreDataConverter<Scene>());

  const searchQuery = query(
    sceneCollection,
    where('searchIndex', 'array-contains', value.toLowerCase()),
    where('deleted', '==', false),
    limit(10),
  );

  try {
    loading.value = true;

    const snapshot = await getDocs(searchQuery);
    result.value = snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error(error);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(error));
  } finally {
    loading.value = false;
  }
}, 600, {
  maxWait: 4000,
});

const reset = () => {
  search.value = '';
  selectedScene.value = undefined;
  result.value = [];
};

const cancel = () => {
  sceneSearchStore.reject();
  reset();
};

watch(search, searchFn);

watchEffect(() => {
  if (selectedScene.value) {
    sceneSearchStore.resolve(selectedScene.value);
    sceneSearchStore.addRecentSelected(selectedScene.value);
    reset();
    state.value = false;
  }
});

const searchScene = useSearchSceneFn();

onKeyStroke(true, (e) => {
  if (
    tableStore.mode !== TableModes.OWN
    || e.code !== 'KeyS'
    || !e.shiftKey
    || (e.target && isEditableElement(e.target))
  ) {
    return;
  }

  e.preventDefault();

  searchScene();
}, {
  dedupe: true,
});

const hotkeyStore = useHotkeyStore();
hotkeyStore.registerHotkey({
  id: 'scene-search',
  key: 'S',
  modifiers: { shift: true },
  description: 'Search for scenes',
  namespace: 'Global',
});
</script>

<template>
  <va-modal
    v-model="state"
    hide-default-actions
    without-transitions
    no-padding
    size="small"
    @cancel="cancel"
  >
    <va-card>
      <va-card-content>
        <ItemSelector
          v-model="search"
          v-model:selected="selectedScene"
          :options="displayResults"
          :loading="loading"
          placeholder="Search scenes"
          autofocus
        >
          <template #header>
            <div v-if="!search && recentSelected.length > 0" class="mb-05 text-secondary">
              Recent scenes
            </div>
            <div v-else-if="search.length > 0 && result.length > 0" class="mb-05 text-secondary">
              Search results
            </div>
          </template>

          <template #default="{ option: scene }">
            <va-list-item-section>
              <va-list-item-label caption>
                {{ scene.title }}
              </va-list-item-label>
            </va-list-item-section>

            <va-list-item-section icon class="selector-actions">
              <va-button
                title="Move all viewers here"
                preset="plain"
                color="primary"
                icon="system_update_alt"
                size="small"
                round
                @click.stop="tableStore.moveAllViewersToScene(scene)"
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
