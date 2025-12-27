// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],
  devtools: {
    enabled: true
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost',
      appURL: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },
  routeRules: {
    '/*': {
      ssr: false
    }
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },
  compatibilityDate: '2024-07-11',
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
});
