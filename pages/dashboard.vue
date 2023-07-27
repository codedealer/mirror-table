<script setup lang="ts">
const userStore = useUserStore();
watchEffect(() => {
  if (!userStore.isLoggedIn) {
    navigateTo('/');
  }
});

useServerSeoMeta({
  title: 'Dashboard',
});
</script>

<template>
  <div class="dashboard-container">
    <h1 class="va-h1 mb">
      Tables List
    </h1>
    <div class="dashboard-content">
      <TheTablesList />

      <AccountCard />
    </div>
  </div>
</template>
