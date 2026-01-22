// https://nuxt.com/docs/api/configuration/nuxt-config
const yandexMapsApiKey = process.env.YANDEX_MAPS_API_KEY || '7a3c61c9-9e01-48b8-ad12-9a5688cc3a1b'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Отключаем app manifest
  features: {
    devLogs: false,
    appManifest: false
  },

  // Убираем префикс папки для компонентов (ui/UButton → UButton, не UiUButton)
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  css: [
    'vue-yandex-maps/css',
    '~/assets/css/main.css'
  ],

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxtjs/google-fonts',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/supabase',
    'vue-yandex-maps/nuxt'
  ],

  yandexMaps: {
    apikey: yandexMapsApiKey,
    initializeOn: 'onComponentMount'
  },

  supabase: {
    redirect: false
  },

  runtimeConfig: {
    // Server-only
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    dadataApiKey: process.env.DADATA_API_KEY || '',
    dadataSecretKey: process.env.DADATA_SECRET_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    beelineApiToken: process.env.BEELINE_API_TOKEN || '',
    // Public
    public: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://supabase.doka.team',
      supabaseKey: process.env.SUPABASE_KEY || '',
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'PG19CONNECTBOT',
      yandexMapsApiKey,
      twaUrl: process.env.TWA_URL || 'https://pg19-tg.doka.team',
      beelineCallNumber: '+7 960 459-69-45'
    }
  },

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark'
  },

  googleFonts: {
    families: {
      Outfit: [400, 500, 600, 700, 800]
    },
    display: 'swap',
    preload: true
  },

  app: {
    head: {
      title: 'ПЖ19 — Личный кабинет',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Личный кабинет абонента ПЖ19. Баланс, счета, услуги, поддержка.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  }
})
