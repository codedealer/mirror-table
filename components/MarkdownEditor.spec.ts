import { mount, type VueWrapper } from '@vue/test-utils';
// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, onMounted, ref, watch } from 'vue';

import MarkdownEditor from './MarkdownEditor.vue';

const resizeCallbacks = vi.hoisted(() => ({
  window: undefined as (() => void) | undefined,
  container: undefined as (() => void) | undefined,
}));

vi.mock('@vueuse/core', () => ({
  useEventListener: (_event: string, callback: () => void) => {
    resizeCallbacks.window = callback;
  },
  useResizeObserver: (_target: unknown, callback: () => void) => {
    resizeCallbacks.container = callback;
  },
}));

const ScrollContainerStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', { class: 'markdown-editor__scroll' }, [
      h('div', { class: 'va-scroll-container__content' }, slots.default?.()),
    ]);
  },
});

let mountedWrapper: VueWrapper | undefined;

beforeAll(() => {
  // Nuxt auto-imports these Vue APIs in application SFCs; provide them in this
  // focused Vitest mount, which uses only the standard Vue plugin.
  Object.assign(globalThis, { ref, watch, nextTick, onMounted });
});

afterEach(() => {
  mountedWrapper?.unmount();
  mountedWrapper = undefined;
  resizeCallbacks.window = undefined;
  resizeCallbacks.container = undefined;
});

const mountEditor = async (modelValue = 'one\ntwo\nthree') => {
  mountedWrapper = mount(MarkdownEditor, {
    props: { modelValue },
    global: {
      stubs: {
        'va-icon': true,
        'va-scroll-container': ScrollContainerStub,
      },
    },
  });
  await nextTick();
  const textarea = mountedWrapper.get('textarea').element as HTMLTextAreaElement;
  const scrollContainer = mountedWrapper.get('.markdown-editor__scroll').element as HTMLElement;
  Object.defineProperty(textarea, 'scrollHeight', {
    configurable: true,
    get: () => textarea.value.split('\n').length * 40,
  });
  return { textarea, scrollContainer };
};

describe('markdown editor textarea sizing', () => {
  it.each([
    ['top', 0],
    ['middle', 360],
    ['bottom', 720],
  ])('preserves the parent scroll container position while editing near the %s', async (_position, scrollTop) => {
    const { textarea, scrollContainer } = await mountEditor(Array.from({ length: 40 }, (_, i) => `row ${i}`).join('\n'));

    scrollContainer.scrollTop = scrollTop;
    const style = textarea.style;
    Object.defineProperty(textarea, 'style', {
      configurable: true,
      value: new Proxy(style, {
        set(target, property, value) {
          // Simulate the browser clamping the scroll container when autosize
          // temporarily collapses the textarea.
          if (property === 'height' && Number.parseFloat(String(value)) === 0) {
            scrollContainer.scrollTop = 0;
          }
          return Reflect.set(target, property, value);
        },
      }),
    });

    textarea.value = Array.from({ length: 41 }, (_, i) => `row ${i}`).join('\n');
    const editedRow = scrollTop / 40;
    const cursorPosition = textarea.value.indexOf(`row ${editedRow}`);
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(scrollContainer.scrollTop).toBe(scrollTop);
  });

  it('recalculates textarea height after container and window resize notifications', async () => {
    const { textarea } = await mountEditor('one\ntwo\nthree');
    expect(resizeCallbacks.container).toBeDefined();
    expect(resizeCallbacks.window).toBeDefined();

    textarea.value = Array.from({ length: 8 }, (_, i) => `row ${i}`).join('\n');
    resizeCallbacks.container?.();
    await nextTick();
    expect(textarea.style.height).toBe('320px');

    textarea.value = Array.from({ length: 5 }, (_, i) => `row ${i}`).join('\n');
    resizeCallbacks.window?.();
    await nextTick();
    expect(textarea.style.height).toBe('200px');
  });
});
