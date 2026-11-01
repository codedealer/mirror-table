// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, proxyRefs, ref, shallowRef, toRaw, watch } from 'vue';
import { useDriveMedia } from '~/composables/useDriveMedia';
import { AssetPropertiesKinds, DataRetrievalStrategies, isAssetProperties } from '~/models/types';

const drive = vi.hoisted(() => ({
  files: new Map<string, Record<string, any>>(),
  loadMedia: vi.fn(),
  cache: undefined as any,
}));

vi.mock('~/utils/driveOps', () => ({
  generateFileRequest: vi.fn((_client: unknown, id: string) => Promise.resolve({ result: drive.files.get(id) })),
  generateMediaRequest: vi.fn(),
  getFile: vi.fn(),
  downloadMedia: (id: string) => drive.loadMedia(id),
  loadMedia: (id: string) => drive.loadMedia(id),
  parseMediaResponse: (file: Record<string, any>, response: { headers: Record<string, string>; body: string }) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    googleContentType: response.headers['X-Goog-Safety-Content-Type'],
    size: file.size,
    md5Checksum: file.md5Checksum,
    loadedAt: Date.now(),
    data: response.body,
  }),
  searchFiles: vi.fn(),
  updateMedia: vi.fn(),
  updateMetadata: vi.fn(),
  uploadMedia: vi.fn(),
  uploadCropMedia: vi.fn(),
  convertToBlob: (media: { data: string; mimeType?: string }) => new Blob([media.data], { type: media.mimeType }),
}));

const checksumA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const checksumB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const image = (id: string, md5Checksum: string, size?: string, canDownload = true) => ({
  id,
  name: `${id}.png`,
  originalFilename: `${id}.png`,
  mimeType: 'image/png',
  md5Checksum,
  size,
  trashed: false,
  ownedByMe: true,
  shared: false,
  capabilities: { canDownload },
  loading: false,
  loadedAt: 0,
});
const crop = () => ({
  ...image('crop', checksumB, '4'),
  properties: { mtc: '1' },
  appProperties: {
    type: 'dependency',
    k: 'c',
    o: 'original',
    m: checksumA,
    c: '1,0,0,1000000,1000000',
  },
});

let driveStore: any;
let store: any;

async function installStore() {
  vi.resetModules();
  drive.files.clear();
  drive.loadMedia.mockReset();
  const client = { newBatch: () => ({ add: vi.fn() }) };
  const piniaStores = new Map<string, any>();
  Object.assign(globalThis, {
    computed,
    ref,
    shallowRef,
    watch,
    DataRetrievalStrategies,
    AssetPropertiesKinds,
    isAssetProperties,
    defineStore: (id: string, setup: () => unknown) => () => {
      if (!piniaStores.has(id))
        piniaStores.set(id, proxyRefs(setup() as any));
      return piniaStores.get(id);
    },
    acceptHMRUpdate: () => () => {},
    useDriveStore: () => ({ getClient: async () => client }),
    useNuxtApp: () => ({ $logger: {
      'cache:memory': vi.fn(),
      'cache:disk': vi.fn(),
      'cache:media': vi.fn(),
      'drive:file': vi.fn(),
      'drive:media': vi.fn(),
    }, callHook: async () => {} }),
    useNotificationStore: () => ({ error: vi.fn() }),
    storeToRefs: (target: unknown) => target,
  });
  const { useCacheStore } = await import('./cache-store');
  const cache = useCacheStore();
  vi.spyOn(cache, 'getMedia');
  vi.spyOn(cache, 'setFiles');
  vi.spyOn(cache, 'setMedia');
  drive.cache = cache;
  Object.assign(globalThis, { useCacheStore: () => cache });
  const { useDriveFileStore } = await import('./drive-file-store');
  store = useDriveFileStore();
  driveStore = store;
  Object.assign(globalThis, { useDriveFileStore: () => driveStore });
  return store;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  drive.files.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('drive media retrieval at the store boundary', () => {
  it('retrieves unknown-size Original media and lets the adapter reject an oversized returned Blob', async () => {
    await installStore();
    drive.files.set('crop', crop());
    drive.files.set('original', image('original', checksumA));
    drive.loadMedia.mockResolvedValue({
      headers: { 'X-Goog-Safety-Content-Type': 'image/png' },
      body: 'small-image-body',
    });
    const { createDriveCropSessionAdapter } = await import('~/utils/image-framing/driveAdapter');

    const result = await createDriveCropSessionAdapter('destination').resolve('crop');

    expect(result.source.blob.size).toBe('small-image-body'.length);
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);
    expect(drive.cache.getMedia).toHaveBeenCalledWith('original', checksumA);
  });

  it('notifies a mounted media consumer when loading completes on a reactive cache alias', async () => {
    await installStore();
    drive.files.set('original', image('original', checksumA, '12'));
    const pendingMedia = deferred<{ headers: Record<string, string>; body: string }>();
    drive.loadMedia.mockReturnValueOnce(pendingMedia.promise);
    const { createDriveCropSessionAdapter } = await import('~/utils/image-framing/driveAdapter');

    const resolving = createDriveCropSessionAdapter('destination').resolve('original');
    await vi.waitFor(() => expect(drive.loadMedia).toHaveBeenCalledTimes(1));
    const rawMetadata = vi.mocked(drive.cache.setFiles).mock.calls[0]![0][0];
    const cachedMetadata = drive.cache.files.original;
    expect(toRaw(cachedMetadata)).toBe(rawMetadata);
    expect(rawMetadata).not.toBe(cachedMetadata);
    expect(cachedMetadata.loading).toBe(true);

    expect(await drive.cache.getMedia('original', checksumA)).toBeUndefined();
    const file = ref(cachedMetadata);
    const consumer = mount(defineComponent({
      setup() {
        const { media } = useDriveMedia(file);
        return () => h('output', media.value?.data ?? 'waiting');
      },
    }));
    expect(consumer.text()).toBe('waiting');

    pendingMedia.resolve({
      headers: { 'X-Goog-Safety-Content-Type': 'image/png' },
      body: 'downloaded-media',
    });
    await resolving;
    await vi.waitFor(() => expect(consumer.text()).toBe('downloaded-media'));
    await nextTick();
    expect(drive.cache.files.original.loading).toBe(false);
    expect(await drive.cache.getMedia('original', checksumA)).toMatchObject({ data: 'downloaded-media' });
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);
    consumer.unmount();
  });

  it('keeps downloaded media usable for a mounted consumer despite persistent cache-write failure', async () => {
    await installStore();
    const cached = image('persistent-failure', checksumA, '12');
    await drive.cache.setFiles([cached]);
    const file = ref(drive.cache.files['persistent-failure']);
    drive.cache.setMedia.mockRejectedValue(new Error('persistent cache write failure'));
    drive.loadMedia.mockResolvedValue({
      headers: { 'X-Goog-Safety-Content-Type': 'image/png' },
      body: 'downloaded-media',
    });
    const consumer = mount(defineComponent({
      setup() {
        const { media, error } = useDriveMedia(file);
        return () => h('output', media.value?.data ?? (error.value instanceof Error ? error.value.message : 'waiting'));
      },
    }));

    await vi.waitFor(() => expect(consumer.text()).toBe('downloaded-media'));
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);
    expect(file.value.loading).toBe(false);
    expect(consumer.text()).toBe('downloaded-media');
    consumer.unmount();
  });

  it('clears a failed selection when switching away and back without displaying stale media', async () => {
    await installStore();
    const imageA = image('selection-a', checksumA, '12');
    const imageB = image('selection-b', checksumB, '12');
    await drive.cache.setFiles([imageA, imageB]);
    const file = ref(drive.cache.files['selection-a']);
    const retryA = deferred<{ headers: Record<string, string>; body: string }>();
    drive.loadMedia
      .mockRejectedValueOnce(new Error('first A request failed'))
      .mockResolvedValueOnce({ headers: { 'X-Goog-Safety-Content-Type': 'image/png' }, body: 'media-B' })
      .mockReturnValueOnce(retryA.promise);
    const consumer = mount(defineComponent({
      setup() {
        const { media, error } = useDriveMedia(file);
        return () => h('output', media.value?.data ?? (error.value instanceof Error ? error.value.message : 'waiting'));
      },
    }));

    await vi.waitFor(() => expect(consumer.text()).toBe('first A request failed'));
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);

    file.value = drive.cache.files['selection-b'];
    await vi.waitFor(() => expect(consumer.text()).toBe('media-B'));
    expect(drive.loadMedia).toHaveBeenCalledTimes(2);

    file.value = drive.cache.files['selection-a'];
    await nextTick();
    expect(consumer.text()).toBe('waiting');
    await vi.waitFor(() => expect(drive.loadMedia).toHaveBeenCalledTimes(3));
    retryA.resolve({ headers: { 'X-Goog-Safety-Content-Type': 'image/png' }, body: 'media-A' });
    await vi.waitFor(() => expect(consumer.text()).toBe('media-A'));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(drive.loadMedia).toHaveBeenCalledTimes(3);
    consumer.unmount();
  });

  it('honors one explicit reload generation changed during a pending failed request', async () => {
    await installStore();
    const cached = image('reload-pending', checksumA, '12');
    await drive.cache.setFiles([cached]);
    const file = ref(drive.cache.files['reload-pending']);
    const reload = ref(0);
    const first = deferred<{ headers: Record<string, string>; body: string }>();
    drive.loadMedia
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ headers: { 'X-Goog-Safety-Content-Type': 'image/png' }, body: 'retry-response' });
    const consumer = mount(defineComponent({
      setup() {
        const { media, error } = useDriveMedia(file, undefined, undefined, reload);
        return () => h('output', media.value?.data ?? (error.value instanceof Error ? error.value.message : 'waiting'));
      },
    }));
    await vi.waitFor(() => expect(drive.loadMedia).toHaveBeenCalledTimes(1));

    reload.value++;
    await nextTick();
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);
    first.reject(new Error('first request failed'));

    await vi.waitFor(() => expect(drive.loadMedia).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(consumer.text()).toBe('retry-response'));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(drive.loadMedia).toHaveBeenCalledTimes(2);
    consumer.unmount();
  });

  it('clears loading and the coalescing entry if caching fails, allowing a later retry', async () => {
    await installStore();
    const cached = image('retry-id', checksumA, '12');
    await drive.cache.setFiles([cached]);
    const fresh = image('retry-id', checksumA, '12');
    drive.cache.setMedia.mockRejectedValueOnce(new Error('cache write failed'));
    drive.loadMedia.mockResolvedValue({
      headers: { 'X-Goog-Safety-Content-Type': 'image/png' },
      body: 'retried-media',
    });

    await expect(store.downloadMedia(fresh, 'lazy')).resolves.toMatchObject({ data: 'retried-media' });
    expect(fresh.loading).toBe(false);
    expect(drive.cache.files['retry-id'].loading).toBe(false);

    // An explicit later call retries cache publication without being stuck in
    // the prior failed coalescing entry.
    await expect(store.downloadMedia(fresh, 'lazy')).resolves.toMatchObject({ data: 'retried-media' });
    expect(drive.loadMedia).toHaveBeenCalledTimes(2);
  });

  it('checks the actual returned size when Original metadata size is missing', async () => {
    await installStore();
    drive.files.set('crop', crop());
    drive.files.set('original', image('original', checksumA));
    drive.loadMedia.mockResolvedValue({
      headers: { 'X-Goog-Safety-Content-Type': 'image/png' },
      body: 'x'.repeat(20 * 1024 * 1024 + 1),
    });
    const { createDriveCropSessionAdapter } = await import('~/utils/image-framing/driveAdapter');

    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/20 MB/);
    expect(drive.loadMedia).toHaveBeenCalledTimes(1);
    expect(drive.cache.getMedia).toHaveBeenCalledWith('original', checksumA);
  });

  it.each(['A', 'B'] as const)('keeps all file objects coherent when overlapping versions complete %s first', async (firstToComplete) => {
    await installStore();
    const requestAResponse = deferred<{ headers: Record<string, string>; body: string }>();
    const requestBResponse = deferred<{ headers: Record<string, string>; body: string }>();
    drive.loadMedia.mockReturnValueOnce(requestAResponse.promise).mockReturnValueOnce(requestBResponse.promise);

    // The real file cache has one entry per ID: a fresh read of B replaces A.
    const canonicalA = image('same-id', checksumA, '4');
    await drive.cache.setFiles([canonicalA]);
    const fileA = image('same-id', checksumA, '4');
    const requestA = store.downloadMedia(fileA, 'lazy');
    await vi.waitFor(() => expect(drive.loadMedia).toHaveBeenCalledTimes(1));

    const canonicalB = image('same-id', checksumB, '4');
    const fileB = image('same-id', checksumB, '4');
    await drive.cache.setFiles([canonicalB]);
    const requestB = store.downloadMedia(fileB, 'lazy');
    await vi.waitFor(() => expect(drive.loadMedia).toHaveBeenCalledTimes(2));
    expect(fileA.loading).toBe(true);
    expect(fileB.loading).toBe(true);
    expect(canonicalA.loading).toBe(true);
    expect(canonicalB.loading).toBe(true);

    const responseA = { headers: { 'X-Goog-Safety-Content-Type': 'image/png' }, body: 'version-a' };
    const responseB = { headers: { 'X-Goog-Safety-Content-Type': 'image/png' }, body: 'version-b' };
    const firstPromise = firstToComplete === 'A' ? requestA : requestB;
    const secondPromise = firstToComplete === 'A' ? requestB : requestA;
    if (firstToComplete === 'A')
      requestAResponse.resolve(responseA);
    else
      requestBResponse.resolve(responseB);
    await firstPromise;

    // While one request remains, all participating objects and the current
    // one-entry canonical record must still report the active work.
    expect(fileA.loading).toBe(true);
    expect(fileB.loading).toBe(true);
    expect(canonicalA.loading).toBe(true);
    expect(canonicalB.loading).toBe(true);

    if (firstToComplete === 'A')
      requestBResponse.resolve(responseB);
    else
      requestAResponse.resolve(responseA);
    await secondPromise;

    expect(fileA.loading).toBe(false);
    expect(fileB.loading).toBe(false);
    expect(canonicalA.loading).toBe(false);
    expect(canonicalB.loading).toBe(false);
    const cachedMedia = await drive.cache.getMedia('same-id', firstToComplete === 'A' ? checksumB : checksumA);
    expect(cachedMedia?.md5Checksum).toBe(firstToComplete === 'A' ? checksumB : checksumA);
    expect(await drive.cache.getMedia('same-id', firstToComplete === 'A' ? checksumA : checksumB)).toBeUndefined();
  });

  it('uses supplied fresh permission and size metadata even when cached checksum matches', async () => {
    await installStore();
    const cached = image('same-id', checksumA, undefined, false);
    await drive.cache.setFiles([cached]);
    const fresh = image('same-id', checksumA, '14', true);
    drive.loadMedia.mockResolvedValue({
      headers: { 'X-Goog-Safety-Content-Type': 'image/png' },
      body: 'fresh-metadata-media',
    });

    const media = await store.downloadMedia(fresh, 'lazy');

    expect(drive.loadMedia).toHaveBeenCalledWith('same-id');
    expect(media).toMatchObject({ md5Checksum: checksumA, size: '14', data: 'fresh-metadata-media' });
    expect(fresh.loading).toBe(false);
    expect(cached.loading).toBe(false);
  });
});
