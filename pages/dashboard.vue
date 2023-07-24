<script setup lang="ts">
const userStore = useUserStore();
watchEffect(() => {
  if (!userStore.isLoggedIn) {
    navigateTo('/');
  }
});
</script>

<template>
  <h1 class="va-h1">
    This is a protected dashboard
  </h1>
  <NuxtLink to="/">
    Go to index
  </NuxtLink>
</template>
