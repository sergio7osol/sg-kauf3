<script setup>
definePageMeta({
  middleware: ['auth']
});

const { user } = useAuth();
</script>

<template>
  <div class="space-y-2 p-4">
    <p><strong>User Name:</strong> {{ user?.name ?? 'Unknown Name' }}</p>
    <p><strong>User Email:</strong> {{ user?.email ?? 'Unknown Email' }}</p>
  </div>
</template>
