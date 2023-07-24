import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.fbApiKey,
    authDomain: config.public.fbAuthDomain,
  };

  const app = initializeApp(firebaseConfig);

  const auth = getAuth(app);

  nuxtApp.vueApp.provide('auth', auth);
  nuxtApp.provide('auth', auth);
});
