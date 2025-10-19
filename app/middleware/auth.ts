export default defineNuxtRouteMiddleware((to, from) => {
  const userLoggedIn = false;

  if (!userLoggedIn) {
    return navigateTo({ path: '/login' });
  }
})
