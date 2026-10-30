import { beforeEach, describe, expect, it, vi } from 'vitest';

const installNuxtGlobals = () => {
  Object.assign(globalThis, {
    computed: (getter: () => unknown) => ({ get value() { return getter(); } }),
    defineStore: (_id: string, setup: () => unknown) => setup,
    ref: (value: unknown) => ({ value }),
    shallowRef: (value?: unknown) => ({ value }),
    toRaw: (value: unknown) => value,
    useNuxtApp: () => ({
      $logger: {
        'cache:disk': vi.fn(),
        'cache:media': vi.fn(),
        'cache:memory': vi.fn(),
      },
    }),
  });
};

interface StubDatabase {
  transaction: ReturnType<typeof vi.fn>;
  records: Map<string, any>;
  readTransactions: Record<string, number>;
  failReads: boolean;
  readGate?: { promise: Promise<void>; release: () => void };
}

const createDatabase = (): StubDatabase => {
  const database: StubDatabase = {
    transaction: vi.fn(),
    records: new Map(),
    readTransactions: { files: 0, media: 0 },
    failReads: false,
  };
  database.transaction.mockImplementation((storeName: string) => {
    database.readTransactions[storeName]++;
    return {
      store: {
        get: vi.fn(async (id: string) => {
          if (database.readGate) {
            await database.readGate.promise;
          }
          if (database.failReads) {
            throw new Error('transaction get failed');
          }
          return database.records.get(id);
        }),
        put: vi.fn(async (value: { id: string }) => {
          database.records.set(value.id, value);
        }),
        delete: vi.fn(async (id: string) => {
          database.records.delete(id);
        }),
      },
      done: Promise.resolve(),
    };
  });
  return database;
};

const media = (id: string, md5Checksum = 'checksum') => ({ id, md5Checksum, data: id });
const file = (id: string) => ({ id, name: id, trashed: false, ownedByMe: true, loading: false, loadedAt: Date.now() });

let store: any;
let database: StubDatabase;

describe('cache store batched reads', () => {
  beforeEach(async () => {
    vi.resetModules();
    installNuxtGlobals();
    database = createDatabase();
    const { useCacheStore } = await import('~/stores/cache-store');
    store = useCacheStore();
    store.db.value = database;
  });

  it('batches media reads, deduplicates ids, and validates each checksum independently', async () => {
    database.records.set('asset-1', media('asset-1'));
    database.records.set('asset-2', media('asset-2', 'new'));

    const results = await Promise.all([
      store.getMedia('asset-1', 'checksum'),
      store.getMedia('asset-1', 'wrong'),
      store.getMedia('asset-2', 'new'),
      store.getMedia('missing', 'checksum'),
    ]);

    expect(database.readTransactions.media).toBe(1);
    expect(results).toEqual([media('asset-1'), undefined, media('asset-2', 'new'), undefined]);
  });

  it('batches disk file reads while retaining per-caller results and ordering', async () => {
    const cached = file('hit');
    database.records.set('hit', cached);

    const results = await Promise.all([
      store.getFiles(['hit']),
      store.getFiles(['missing', 'hit']),
      store.getFiles(['hit', 'missing']),
    ]);

    expect(database.readTransactions.files).toBe(1);
    expect(results).toEqual([[cached], [cached], [cached]]);
  });

  it('keeps skipDisk and fully memory-satisfied file reads off disk', async () => {
    const cached = file('memory');
    store.files.value.memory = cached;

    expect(await store.getFiles(['memory'])).toEqual([cached]);
    expect(await store.getFiles(['not-cached'], { skipDisk: true })).toEqual([]);
    expect(database.readTransactions.files).toBe(0);
  });

  it('coalesces reads after different promise depths in one macrotask window', async () => {
    database.records.set('a', media('a'));
    database.records.set('b', media('b'));
    const request = async (id: string, depth: number) => {
      for (let i = 0; i < depth; i++) {
        await Promise.resolve();
      }
      return store.getMedia(id);
    };

    expect(await Promise.all([request('a', 0), request('b', 8)])).toEqual([media('a'), media('b')]);
    expect(database.readTransactions.media).toBe(1);
  });

  it('flushes a lone request at the end of its bounded read window', async () => {
    vi.useFakeTimers();
    const value = media('single');
    database.records.set(value.id, value);
    const result = store.getMedia(value.id);

    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toEqual(value);
    expect(database.readTransactions.media).toBe(1);
    vi.useRealTimers();
  });

  it('bounds a batch at 100 ids and serves excess requests in a follow-up batch', async () => {
    const requests = Array.from({ length: 101 }, (_, index) => {
      const id = `id-${index}`;
      database.records.set(id, media(id));
      return store.getMedia(id);
    });

    expect((await Promise.all(requests)).length).toBe(101);
    expect(database.readTransactions.media).toBe(2);
  });

  it('queues reads arriving during a flush for exactly one subsequent transaction', async () => {
    let release!: () => void;
    database.readGate = {
      promise: new Promise<void>((resolve) => {
        release = resolve;
      }),
      release: () => release(),
    };
    database.records.set('first', media('first'));
    database.records.set('second', media('second'));

    const first = store.getMedia('first');
    await new Promise(resolve => setTimeout(resolve, 60));
    const second = store.getMedia('second');
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(database.readTransactions.media).toBe(1);
    database.readGate.release();

    expect(await Promise.all([first, second])).toEqual([media('first'), media('second')]);
    expect(database.readTransactions.media).toBe(2);
  });

  it('rejects all batch waiters after a read failure and accepts a later successful read', async () => {
    database.failReads = true;
    const results = await Promise.allSettled([store.getMedia('bad-1'), store.getMedia('bad-2')]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect((results[0] as PromiseRejectedResult).reason).toBe((results[1] as PromiseRejectedResult).reason);

    database.failReads = false;
    database.records.set('good', media('good'));
    await expect(store.getMedia('good')).resolves.toEqual(media('good'));
    expect(database.readTransactions.media).toBe(2);
  });

  it('drains a bounded snapshot before a write without absorbing later reads', async () => {
    let release!: () => void;
    database.readGate = {
      promise: new Promise<void>((resolve) => {
        release = resolve;
      }),
      release: () => release(),
    };
    database.records.set('active', media('active'));
    const activeRead = store.getMedia('active');
    await new Promise(resolve => setTimeout(resolve, 60));

    const queuedReads = Array.from({ length: 101 }, (_, index) => {
      const id = `queued-${index}`;
      database.records.set(id, media(id));
      return store.getMedia(id);
    });
    const deleting = store.deleteMedia(['queued-100']);
    const readAfterDrainSnapshot = store.getMedia('queued-100');
    release();

    await deleting;
    await expect(activeRead).resolves.toEqual(media('active'));
    expect(await Promise.all(queuedReads)).toEqual(queuedReads.map((_, index) => media(`queued-${index}`)));
    await expect(readAfterDrainSnapshot).resolves.toBeUndefined();
    expect(database.readTransactions.media).toBe(5);
    expect(database.records.has('queued-100')).toBe(false);
  });

  it('flushes a queued read before a delete begins', async () => {
    database.records.set('delete-me', media('delete-me'));

    const read = store.getMedia('delete-me');
    await store.deleteMedia(['delete-me']);

    await expect(read).resolves.toEqual(media('delete-me'));
    expect(database.records.has('delete-me')).toBe(false);
    expect(database.readTransactions.media).toBe(2);
    await expect(store.getMedia('delete-me')).resolves.toBeUndefined();
    expect(database.readTransactions.media).toBe(3);
  });

  it('flushes a queued read before a media write and reads the new value afterward', async () => {
    const oldValue = media('write-me', 'old');
    const newValue = media('write-me', 'new');
    database.records.set(oldValue.id, oldValue);

    const queuedRead = store.getMedia(oldValue.id);
    await store.setMedia([newValue]);

    await expect(queuedRead).resolves.toEqual(oldValue);
    await expect(store.getMedia(oldValue.id)).resolves.toEqual(newValue);
    expect(database.readTransactions.media).toBe(3);
  });

  it('keeps reads for unrelated ids batched when a write occurs', async () => {
    database.records.set('a', media('a'));
    database.records.set('b', media('b'));
    database.records.set('c', media('c'));

    const reads = [store.getMedia('a'), store.getMedia('b'), store.getMedia('c')];
    await store.setMedia([media('other')]);
    // only the write transaction so far; unrelated reads are still queued
    expect(database.readTransactions.media).toBe(1);

    expect(await Promise.all(reads)).toEqual([media('a'), media('b'), media('c')]);
    expect(database.readTransactions.media).toBe(2); // one write transaction + one batched read
  });

  it('uses the in-memory media fallback without scheduling when IndexedDB is unavailable', async () => {
    store.db.value = undefined;
    await store.setMedia([media('memory-media')]);

    await expect(store.getMedia('memory-media', 'checksum')).resolves.toEqual(media('memory-media'));
    await expect(store.getMedia('memory-media', 'mismatch')).resolves.toBeUndefined();
    expect(database.readTransactions.media).toBe(0);
  });
});
