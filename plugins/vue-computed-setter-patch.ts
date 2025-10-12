import { defineNuxtPlugin } from '#app';
import { computed } from 'vue';

/**
 * Vue 3.5 renamed the internal computed setter field from `_setter` to `setter`.
 * Vuestic still checks for `_setter`, so dirty events stopped working.
 * This alias keeps backward compatibility until Vuestic updates its internals.
 */
export default defineNuxtPlugin(() => {
  const sample = computed({
    get: () => undefined,
    set: () => undefined,
  });

  const proto = Object.getPrototypeOf(sample);
  if (!proto) {
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(proto, '_setter');
  if (descriptor) {
    return;
  }

  Object.defineProperty(proto, '_setter', {
    get() {
      return this.setter;
    },
    set(value) {
      this.setter = value;
    },
    configurable: true,
  });
});
