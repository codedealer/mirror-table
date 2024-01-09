<script setup lang="ts">
import { onKeyStroke, useDebounceFn } from '@vueuse/core';
import { collection, getDocs, limit, query, where } from '@firebase/firestore';
import ItemSelector from '~/components/ItemSelector.vue';
import type { Scene } from '~/models/types';

const state = ref(false);

const selectedScene = ref<Scene>();
const search = ref('');

const { $db } = useNuxtApp();
const tableStore = useTableStore();

const result = ref<Scene[]>([]);

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
    const snapshot = await getDocs(searchQuery);
    result.value = snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error(error);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(error));
  }
}, 1000, {
  maxWait: 4000,
});

const reset = () => {
  search.value = '';
  selectedScene.value = undefined;
  result.value = [];
};

watch(search, searchFn);

watchEffect(() => {
  if (tableStore.sessionId && selectedScene.value) {
    tableStore.setActiveScene(tableStore.sessionId, selectedScene.value);
    reset();
    state.value = false;
  }
});

onKeyStroke(true, (e) => {
  if (
    e.code !== 'KeyS' ||
    !e.shiftKey ||
    (e.target && isEditableElement(e.target))
  ) {
    return;
  }

  e.preventDefault();

  state.value = tableStore.mode === TableModes.OWN && !state.value;
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
          v-model:selected="selectedScene"
          :options="result"
          placeholder="Search scenes"
          autofocus
        >
          <template #default="{ option: scene }">
            <va-list-item-section>
              <va-list-item-label caption>
                {{ (scene as Scene).title }}
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
                @click.stop="tableStore.moveAllViewersToScene(scene as Scene)"
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
