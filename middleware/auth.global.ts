export default defineNuxtRouteMiddleware(async (to, _from) => {
  if (to.path === '/dev') {
    if (!import.meta.dev) {
      return abortNavigation(createError({
        statusCode: 404,
        statusMessage: 'Not Found',
      }));
    }

    return;
  }

  const userStore = useUserStore();

  const publicRoutes = ['/', '/d'];
  if (!userStore.isLoggedIn) {
    if (!publicRoutes.includes(to.path)) {
      return navigateTo('/');
    }
  } else if (to.path === '/') {
    return navigateTo('/dashboard');
  }
});
