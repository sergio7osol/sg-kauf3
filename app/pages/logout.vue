<script setup>
const { logout } = useAuth();

await logout();
</script>

<template>
  <div class="p-4 text-center text-lg font-medium">Logging Out...</div>
</template>
