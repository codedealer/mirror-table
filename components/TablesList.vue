<script setup lang="ts">
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, orderBy, query } from '@firebase/firestore';
import type { TableCard } from '~/models/types';

let tables = ref<TableCard[] | undefined>(undefined);

onMounted(() => {
  const { $db } = useNuxtApp();

  const userStore = useUserStore();

  const q = computed(() => {
    if (!userStore.isAuthenticated || !userStore.user) {
      return false;
    }
    return query(
      collection($db, 'users', userStore.user.uid, 'tables')
        .withConverter(firestoreDataConverter<TableCard>()),
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
