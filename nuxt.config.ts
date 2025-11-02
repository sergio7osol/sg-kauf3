// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-07-11',

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  devtools: {
    enabled: true
  },

    modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  css: ['~/assets/css/main.css'],
  
  runtimeConfig: {  
    public: {
      apiBase: 'http://localhost',
      appURL: 'http://localhost:3000',
    },
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
