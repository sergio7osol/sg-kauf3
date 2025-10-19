<script setup lang="ts">
const user = useUser();

definePageMeta({
  layout: 'plain',
  middleware: ['auth']
})
</script>

<template>
  <h2>Admin page</h2>
  <nav>
    <ul>
      <li>
        <NuxtLink to="/">Home</NuxtLink>
      </li>
    </ul>
  </nav>
</template>