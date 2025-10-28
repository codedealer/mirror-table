import { defineNuxtConfig } from 'nuxt/config'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      ],
    },
    layoutTransition: {
      name: 'slide-fade',
      mode: 'out-in',
    },
    pageTransition: {
      name: 'slide-fade',
      mode: 'out-in',
    },
  },
  compatibilityDate: '2025-10-11',
  imports: {
    dirs: [
      resolve('./stores'),
      resolve('./models'),
    ],
  },
  modules: [
    '@pinia/nuxt',
    '@vuestic/nuxt',
  ],
  routeRules: {
    /*'/': { prerender: true },*/
    '/d': { ssr: false },
    '/g/**': { ssr: false },
  },
  runtimeConfig: {
    fbServiceAccount: process.env.FB_SERVICE_ACCOUNT,
    clientSecret: process.env.CLIENT_SECRET,
    googleAuthRedirectUri: process.env.GOOGLE_AUTH_REDIRECT_URI,
    public: {
      fbApiKey: process.env.FB_API_KEY,
      fbAuthDomain: process.env.FB_AUTH_DOMAIN,
      clientId: process.env.CLIENT_ID,
      projectId: process.env.FB_PROJECT_ID,
      parentFolder: 'Mirror Table',
      rootFolder: 'root',
      searchFolder: '.search',
      debugEnabled: process.env.LOG_ENABLED?.toLowerCase() === 'true',
      debugNamespace: process.env.LOG_NAMESPACE ?? 'app:*',
    },
  },
  spaLoadingTemplate: resolve('./loader.html'),
  vite: {
    vue: {
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    },
  },
  vuestic: {
    css: ['reset', 'typography'],
    config: {
      colors: {
        presets: {
          dark: {
            primary: '#FA45AB',
            secondary: '#2DE8FA',
            tertiary: '#FAE65F',
            'primary-dark': '#AD1F70',
            'secondary-dark': '#28A2AD',
            'danger-dark': '#6f160e',
          }
        },
        currentPresetName: 'dark',
      },
      components: {
        presets: {
          VaButton: {
            outlined: {
              backgroundOpacity: 0,
              borderColor: 'primary',
              hoverMaskColor: 'primary',
              pressedMaskColor: 'primary',
              pressedOpacity: 0.3,
            },
          },
        },
      },
    },
  },
})
