import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-30',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    // Server-only. When both are set, /api/runs reads live TestabilityRun
    // documents from Cloudant instead of the bundled seed.
    cloudantUrl: process.env.CLOUDANT_URL || '',
    cloudantApiKey: process.env.CLOUDANT_API_KEY || '',
    cloudantDb: process.env.CLOUDANT_DB || 'testability-runs',
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Seamwork — approved PRs arrive with their tests',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Seamwork is an agentic pipeline that reads an approved PR for testability barriers, opens a minimal seam PR, and generates the unit, integration and e2e tests it was missing.',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,600;1,600&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
})
