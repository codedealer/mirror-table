export default {
  nitro: {
    preset: 'vercel-edge',
  },
  modules: [
    '@pinia/nuxt',
    '@vuestic/nuxt',
  ],
  runtimeConfig: {
    public: {
      fbApiKey: process.env.FB_API_KEY,
      fbAuthDomain: process.env.FB_AUTH_DOMAIN,
    }
  },
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg', href: '/logo.svg' },
      ]
    },
    pageTransition: {
      name: 'slide-fade',
      mode: 'out-in',
    },
    layoutTransition: {
      name: 'slide-fade',
      mode: 'out-in',
    }
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
          }
        },
        currentPresetName: 'dark',
      }
    }
  },
  imports: {
    dirs: ['stores', 'models']
  },
}
