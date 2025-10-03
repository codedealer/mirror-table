export interface ScriptReference {
  ready: Ref<boolean>;
  loading: Ref<boolean>;
}
const scriptRecord: Map<string, ScriptReference> = new Map();

export const useAsyncScriptTag = (src: string, err?: () => void): ScriptReference => {
  const ready = ref(false);
  const loading = ref(false);

  if (typeof document === 'undefined') {
    return { ready, loading };
  }

  if (!scriptRecord.has(src)) {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;

    const onReady = () => {
      ready.value = true;
      loading.value = false;
    };

    const onLoad = () => {
      onReady();
    };

    const onError = () => {
      loading.value = false;
      scriptRecord.delete(src); // remove from record so it can be retried
      err && err();
    };

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    document.body.appendChild(script);

    loading.value = true;

    scriptRecord.set(src, { ready, loading });
  }

  return scriptRecord.get(src) as ScriptReference;
};
