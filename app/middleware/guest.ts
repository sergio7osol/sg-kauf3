export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { user, initUser } = useAuth();

  await initUser();

  if (user.value) {
    return navigateTo('/me');
  }
});
