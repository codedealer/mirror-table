<script setup lang="ts">
import { signIn } from '@/composables/useFirebaseAuth';

const userStore = useUserStore();
watchEffect(() => {
  if (userStore.isLoggedIn) {
    navigateTo('/dashboard');
  }
});
</script>

<template>
  <div>
    <h1 class="va-h1">
      Index
    </h1>
    <p>This is the index page for anonymous users.</p>
    <va-button @click="signIn">
      Sign In with Google
    </va-button>
  </div>
</template>
