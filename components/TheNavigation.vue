<script setup lang="ts">
import { useAuthCodeFlowAuth } from '#imports';

const authorize = async () => {
  const universalClient = useAuthCodeFlowAuth({});

  try {
    await universalClient.requestToken();
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
  }
};
</script>

<template>
  <va-navbar class="mb-3">
    <template #left>
      <va-navbar-item>
        <NuxtLink to="/">
          <img src="/logo.svg" alt="Mirror Table" width="40" height="40">
        </NuxtLink>
      </va-navbar-item>
    </template>
    <template #right>
      <va-navbar-item>
        <a
          href="https://github.com/codedealer/mirror-table"
          rel="nofollow"
          target="_blank"
        >
          <img src="/github.svg" width="24" height="24" alt="Github repository">
        </a>
      </va-navbar-item>
      <va-navbar-item>
        <va-divider class="va-divider--vertical" />
      </va-navbar-item>
      <va-navbar-item>
        <va-button
          icon="science"
          preset="primary"
          color="secondary-dark"
          @click="authorize"
        />
      </va-navbar-item>
      <va-navbar-item>
        <TheNavigationDrive />
      </va-navbar-item>
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
</template>

<style lang="scss">
.va-navbar__item {
  align-items: center;
  display: flex;
  .va-divider--vertical {
    display: block;
    height: 100%;
    border-right-color: var(--va-primary-dark);
  }
}
</style>
