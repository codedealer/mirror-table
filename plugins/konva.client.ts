import VueKonva from 'vue-konva';

export default defineNuxtPlugin((nuxtApp) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  nuxtApp.vueApp.use(VueKonva);
});
