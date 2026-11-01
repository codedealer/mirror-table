import type { DriveFile } from '~/models/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, shallowRef, watch } from 'vue';
import { DataRetrievalStrategies } from '~/models/types';
import { useDriveFile } from './useDriveFile';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface Result { error?: unknown }
const requests: Array<ReturnType<typeof deferred<Result>>> = [];
const registry = ref<Record<string, DriveFile>>({});
const ready = ref(true);
const getFile = vi.fn(() => {
  const request = deferred<Result>();
  requests.push(request);
  return request.promise;
});

beforeEach(() => {
  requests.length = 0;
  registry.value = {};
  ready.value = true;
  getFile.mockClear();
  Object.assign(globalThis, {
    computed,
    ref,
    shallowRef,
    watch,
    DataRetrievalStrategies,
    useDriveStore: () => ({ isReady: ready }),
    useDriveFileStore: () => ({ files: registry, getFile }),
    storeToRefs: (store: unknown) => store,
  });
});
afterEach(() => vi.clearAllMocks());

describe('useDriveFile request ownership', () => {
  it('does not let an old success clear the current request error', async () => {
    const id = ref('a');
    const scope = effectScope();
    const state = scope.run(() => useDriveFile(id, { strategy: DataRetrievalStrategies.RECENT }))!;
    id.value = 'b';
    await nextTick();
    const failure = new Error('B failed');
    requests[1]!.resolve({ error: failure });
    await nextTick();
    expect(state.error.value).toBe(failure);
    requests[0]!.resolve({});
    await nextTick();
    expect(state.error.value).toBe(failure);
    scope.stop();
  });

  it('clears a previous ID error while a new selection is pending', async () => {
    const id = ref('a');
    const scope = effectScope();
    const state = scope.run(() => useDriveFile(id, { strategy: DataRetrievalStrategies.RECENT }))!;
    requests[0]!.resolve({ error: new Error('A failed') });
    await nextTick();
    expect(state.error.value).toBeInstanceOf(Error);
    id.value = 'b';
    await nextTick();
    expect(state.file.value).toBeUndefined();
    expect(state.error.value).toBeNull();
    scope.stop();
  });

  it('invalidates an earlier same-ID request on reload and on unmount', async () => {
    const id = ref('a');
    const reload = ref(0);
    const scope = effectScope();
    const state = scope.run(() => useDriveFile(id, { strategy: DataRetrievalStrategies.RECENT, reloadRef: reload }))!;
    reload.value++;
    await nextTick();
    const failure = new Error('Reload failed');
    requests[1]!.resolve({ error: failure });
    await nextTick();
    requests[0]!.reject(new Error('Old request threw'));
    await nextTick();
    expect(state.error.value).toBe(failure);
    reload.value++;
    await nextTick();
    scope.stop();
    requests[2]!.resolve({ error: new Error('After unmount') });
    await nextTick();
    expect(state.error.value).toBe(failure);
  });

  it('ignores a completion if the ID or readiness changed before the watcher reruns', async () => {
    const id = ref('a');
    const scope = effectScope();
    const state = scope.run(() => useDriveFile(id, { strategy: DataRetrievalStrategies.RECENT }))!;
    requests[0]!.resolve({ error: new Error('Old error') });
    id.value = '';
    await nextTick();
    expect(state.error.value).toBeNull();
    expect(state.file.value).toBeUndefined();

    id.value = 'b';
    await nextTick();
    requests[1]!.resolve({ error: new Error('Not ready') });
    ready.value = false;
    await nextTick();
    expect(state.error.value).toBeNull();
    scope.stop();
  });
});
