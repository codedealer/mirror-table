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
  vuestic: {
    css: ['reset', 'typography'],
    config: {
      colors: {
        presets: {
          dark: {
            primary: '#ff4081',
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
