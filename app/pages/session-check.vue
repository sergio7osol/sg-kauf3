<script setup lang="ts">
import axios from 'axios'

axios.get('/user');

definePageMeta({
  middleware: ['auth']
})

const statusMessage = ref('Checking session…')


</script>

<template>
  <div class="p-6 space-y-2">
    <h1 class="text-2xl font-semibold">Laravel Session Check</h1>
    <p>{{ statusMessage }}</p>
  </div>
</template>
