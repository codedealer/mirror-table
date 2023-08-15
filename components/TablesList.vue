<script setup lang="ts">
import { useFirestore } from '@vueuse/firebase/index';
import type { Table } from '~/models/types';

let tables = ref<Table[] | undefined>(undefined);

onMounted(() => {
  const { $db, $ops } = useNuxtApp();

  const userStore = useUserStore();
  const { collection, query, where, orderBy } = $ops;
  const q = computed(() => {
    if (!userStore.isAuthenticated) {
      return false;
    }
    return query(
      collection($db, 'tables').withConverter(firestoreDataConverter<Table>()),
      where('permissions', 'array-contains', userStore.user!.uid),
      orderBy('lastAccess', 'desc'),
    );
  });

  tables = useFirestore(q, undefined);
});
</script>

<template>
  <div class="tables-list-container">
    <div class="tables-list">
      <TablesListElement>
        <TablesListElementNew />
      </TablesListElement>
      <ClientOnly>
        <div v-if="Array.isArray(tables)" class="ghost-container">
          <TablesListElement v-for="table in tables" :key="table.id">
            <TablesListElementTable :table="table" />
          </TablesListElement>
        </div>
        <div v-else class="ghost-container">
          <TablesListElement>
            <TablesListElementSkeleton />
          </TablesListElement>
          <TablesListElement>
            <TablesListElementSkeleton />
          </TablesListElement>
          <TablesListElement>
            <TablesListElementSkeleton />
          </TablesListElement>
        </div>

        <template #fallback>
          <TablesListElement>
            <TablesListElementSkeleton />
          </TablesListElement>
          <TablesListElement>
            <TablesListElementSkeleton />
          </TablesListElement>
          <TablesListElement>
            <TablesListElementSkeleton />
          </TablesListElement>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
