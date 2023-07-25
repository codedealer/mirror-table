<script setup lang="ts">
import { signIn } from '@/composables/useFirebaseAuth';

useServerSeoMeta({
  title: 'Mirror Table - Virtual Tabletop Display',
  ogTitle: 'Mirror Table - Virtual Tabletop Display',
  ogImage: '/logo.svg',
});

const userStore = useUserStore();
watchEffect(() => {
  if (userStore.isLoggedIn) {
    navigateTo('/dashboard');
  }
});
</script>

<template>
  <div class="screen-center">
    <div class="logo">
      <img src="/logo.svg" width="200" height="200" alt="Mirror Table Logo">
    </div>

    <VaCard
      color="primary-dark"
      gradient
      class="welcome-card"
    >
      <VaCardTitle>
        Mirror Table
      </VaCardTitle>
      <VaCardContent>
        Mirror Table is a virtual tabletop display for your tabletop roleplaying games. It is designed to be used with a TV or monitor that is placed under a glass table or placed before the players but can be used in any similar capacity including fully remote presentation.
      </VaCardContent>
    </VaCard>

    <VaCard class="login-card">
      <VaCardContent>
        To get started, sign in with your Google account. Mirror Table will use your Google Drive to store the assets for your games.
      </VaCardContent>
      <VaCardActions align="center">
        <VaButton
          preset="secondary"
          border-color="primary"
          icon="add_to_drive"
          size="large"
          @click="signIn"
        >
          Sign In
        </VaButton>
      </VaCardActions>
    </VaCard>

    <footer class="va-text-center">
      <small>
        <a
          href="https://github.com/codedealer/mirror-table"
          rel="nofollow"
          target="_blank"
        >
          <img src="/github.svg" width="24" height="24" alt="Github repository">
        </a>
      </small>
    </footer>
  </div>
</template>

<style lang="scss">
.screen-center {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 100vh;
  padding: 1rem;
  footer {
    margin-top: 2rem;
    a {
      opacity: .7;
      transition: opacity .3s ease-in-out;
      &:hover {
        opacity: 1;
      }
    }
  }
}
.logo {
  width: 200px;
  height: 200px;
  margin-bottom: 3rem;
  img {
    object-fit: contain;
  }
}
.index-card {
  width: clamp(250px, 80%, 500px);
  .va-card__content {
    line-height: 1.5;
  }
}
.welcome-card {
  @extend .index-card;
  padding-bottom: 100px;
  .va-card__title {
    font-size: 2rem;
    font-weight: 400;
    justify-content: center;
  }
}
.login-card {
  @extend .index-card;
  width: clamp(230px, 70%, 480px);
  margin-top: -60px;
}
</style>
