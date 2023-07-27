<script setup lang="ts">
const userStore = useUserStore();

onMounted(() => {
  initAuth(async (user) => {
    if (user) {
      console.log('User signed in: ', user);
      await userStore.signInUser(user);
    } else {
      userStore.signOutUser();
    }
    userStore.authInitialized = true;
  });
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang="scss">
@import "@/assets/styles.scss";
</style>
