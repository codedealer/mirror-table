import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url);
export default {
  alias: {
    "jose": resolve(__dirname, "./node_modules/jose/dist/browser/index.js"),
    "@panva/hkdf": resolve(__dirname, "./node_modules/@panva/hkdf/dist/web/index.js"),
  },
  nitro: {
    preset: 'vercel-edge',
  },
  modules: [
    '@pinia/nuxt',
    '@vuestic/nuxt',
    'nuxt-vue3-google-signin',
  ],
  runtimeConfig: {
    fbServiceAccount: process.env.FB_SERVICE_ACCOUNT,
    public: {
      fbApiKey: process.env.FB_API_KEY,
      fbAuthDomain: process.env.FB_AUTH_DOMAIN,
      clientId: process.env.CLIENT_ID,
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
      ],
      script: [
        {
          src: 'https://apis.google.com/js/api.js',
          async: true,
          defer: true,
          onload: 'window.gapi_loaded = true;',
        },
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
  googleSignIn: {
    clientId: process.env.CLIENT_ID,
  },
  imports: {
    dirs: ['stores', 'models']
  },
}
