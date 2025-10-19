<script setup lang="ts">
import { useHead } from 'nuxt/app'

useHead({
  title: 'SG-Kauf',
  titleTemplate: '%s | SG-Kauf',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Personal money tracking app' },
    { name: 'keywords', content: 'SG-Kauf, money tracking, personal finance' },
    { name: 'author', content: 'Sergey Osokin' },
    { name: 'robots', content: 'index, follow' }
  ],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
