<script setup lang="ts">
import type { TableCard } from '~/models/types';
import { collection, orderBy, query } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';

const userStore = useUserStore();
const { $db } = useNuxtApp();

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

// useFirestore returns a Ref in VueUse 11+
const tables = useFirestore(q, undefined) as Ref<TableCard[] | undefined>;
</script>

<template>
  <div class="tables-list-container">
    <div class="tables-list">
      <TablesListElement>
        <TablesListElementNew />
      </TablesListElement>
      <ClientOnly>
        <div v-if="tables && Array.isArray(tables)" class="ghost-container">
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
