export default defineNuxtRouteMiddleware((to, from) => {
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
