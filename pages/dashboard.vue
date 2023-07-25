<script setup lang="ts">
import { signOut } from '~/composables/useFirebaseAuth';

const userStore = useUserStore();
watchEffect(() => {
  if (!userStore.isLoggedIn) {
    navigateTo('/');
  }
});

definePageMeta({
  title: 'Dashboard',
});
</script>

<template>
  <div class="page-wrapper">
    <va-navbar class="mb-3">
      <template #left>
        <va-navbar-item>
          <NuxtLink to="/">
            Mirror Table
          </NuxtLink>
        </va-navbar-item>
      </template>
      <template #right>
        <va-navbar-item>
          <va-button
            icon="logout"
            preset="primary"
            color="secondary-dark"
            @click="signOut"
          >
            Sign Out
          </va-button>
        </va-navbar-item>
      </template>
    </va-navbar>

    <div class="dashboard-container">
      <h1 class="va-h1 mb">
        Tables List
      </h1>
      <div class="dashboard-content">
        <TheTablesList />

        <AccountCard />
      </div>
    </div>
  </div>
</template>
