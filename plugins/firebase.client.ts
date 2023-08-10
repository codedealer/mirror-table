import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, onSnapshot, setDoc } from '@firebase/firestore';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.fbApiKey,
    authDomain: config.public.fbAuthDomain,
    projectId: config.public.projectId,
  };

  const app = initializeApp(firebaseConfig);

  const auth = getAuth(app);
  const db = getFirestore(app);

  const ops = {
    doc,
    setDoc,
    onSnapshot,
  };

  nuxtApp.vueApp.provide('auth', auth);
  nuxtApp.provide('auth', auth);
  nuxtApp.provide('db', db);
  nuxtApp.vueApp.provide('db', db);
  nuxtApp.provide('ops', ops);
  nuxtApp.vueApp.provide('ops', ops);
});
