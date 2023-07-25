<script setup lang="ts">
const userStore = useUserStore();

onMounted(() => {
  initAuth((user) => {
    if (user) {
      userStore.signInUser(user);
    } else {
      userStore.signOutUser();
    }
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
