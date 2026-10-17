// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
  ],

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/base.css',
    '~/assets/css/components.css',
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1C2D4A' },
      ],
      link: [{ rel: 'icon', type: 'image/png', href: '/brand/oqoudi-logo-tight.png' }],
    },
  },

  fonts: {
    families: [
      { name: 'Cairo', provider: 'google', weights: [500, 600, 700, 800], subsets: ['arabic', 'latin'] },
      { name: 'IBM Plex Sans Arabic', provider: 'google', weights: [400, 500, 600, 700], subsets: ['arabic', 'latin'] },
    ],
  },

  i18n: {
    defaultLocale: 'ar',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'ar', language: 'ar-EG', dir: 'rtl', name: 'العربية', file: 'ar.json' },
      { code: 'en', language: 'en-US', dir: 'ltr', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: false,
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  supabase: {
    // Auth redirects are handled by our own role-aware middleware.
    redirect: false,
    types: '~~/shared/types/database.types.ts',
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },

  runtimeConfig: {
    /** Manual transfer verification. Resolved server-side only (server/services/payments/manual.ts). */
    payments: {
      mode: process.env.PAYMENT_MODE || 'manual_demo',
      liveAcknowledged: process.env.PAYMENT_LIVE_ACKNOWLEDGED || '',
    },
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  routeRules: {
    // Private areas: never cache, never index.
    '/account/**': { headers: { 'cache-control': 'no-store' } },
    '/en/account/**': { headers: { 'cache-control': 'no-store' } },
    '/dashboard/**': { headers: { 'cache-control': 'no-store' } },
    '/en/dashboard/**': { headers: { 'cache-control': 'no-store' } },
    '/api/**': { headers: { 'cache-control': 'no-store' } },
    // OAuth return page: decided in the browser (the PKCE code exchange happens
    // in the client), never cached, and never leaks its URL via Referer.
    '/auth/callback': { ssr: false, headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } },
    '/en/auth/callback': { ssr: false, headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } },
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'SAMEORIGIN',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        },
      },
    },
  },

  typescript: {
    strict: true,
  },

  vite: {
    optimizeDeps: {
      include: ['@lucide/vue', 'zod', '@vue/devtools-core', '@vue/devtools-kit'],
    },
  },

  eslint: {
    config: { stylistic: false },
  },
})
