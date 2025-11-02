<script setup lang="ts">
import { useHead } from 'nuxt/app'

const colorMode = useColorMode()
const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  title: 'SG-Kauf',
  titleTemplate: '%s | SG-Kauf',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Personal money tracking app' },
    { name: 'keywords', content: 'SG-Kauf, money tracking, personal finance' },
    { name: 'author', content: 'Sergey Osokin' },
    { name: 'robots', content: 'index, follow' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'SG-Kauf app'
const description = 'Personal money tracking app'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/logo.png',
  twitterImage: '/logo.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
