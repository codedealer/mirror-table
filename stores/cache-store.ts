import type { IDBPDatabase } from 'idb';
import type { CacheSchema, DriveFile, GetFilesOptions, RawMediaObject } from '~/models/types';

import colors from 'ansi-colors';
import { openDB } from 'idb';
import { isDriveFile } from '~/models/types';

const { bgBlack } = colors;

const CACHE_READ_WINDOW_MS = 50;
const CACHE_READ_MAX_BATCH_SIZE = 100;

const formatIds = (
  requested: string[] | number[],
  retrieved: string[] | number[],
) => {
  let result = '';
  const hitMsg = retrieved.length === requested.length
    ? `${bgBlack.green('HIT')}`
    : (retrieved.length > 0 ? `${bgBlack.yellow('PARTIAL HIT')}` : `${bgBlack.red('MISS')}`);
  result += `${hitMsg} (${retrieved.length}/${requested.length}):\n`;

  if (requested.length === retrieved.length) {
    return result + retrieved.join(', ');
  }
  if (requested.length) {
    result += `Requested: ${requested.join(', ')}`;
  }
  if (retrieved.length) {
    result += `Retrieved: ${retrieved.join(', ')}`;
  }

  return result;
};

interface ReadWaiter<T> {
  resolve: (value: T | undefined) => void;
  reject: (error: unknown) => void;
  isValid: (value: T | undefined) => value is T;
}

interface PendingRead<T> {
  id: string;
  waiters: ReadWaiter<T>[];
}

/** Coalesces individual keyed reads into bounded read-only transactions. */
const createReadScheduler = <T>(
  getDb: () => IDBPDatabase<CacheSchema> | undefined,
  storeName: 'files' | 'media',
  log: (message: string) => void,
) => {
  const pending = new Map<string, PendingRead<T>>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeFlush: Promise<void> | undefined;
  let isDraining = false;
  let flushBatch: () => Promise<void>;

  const queueFlush = () => {
    if (!timer && !activeFlush && !isDraining) {
      timer = setTimeout(() => {
        timer = undefined;
        void flushBatch();
      }, CACHE_READ_WINDOW_MS);
    }
  };

  const flushEntries = (batch: PendingRead<T>[]): Promise<void> => {
    const db = getDb();

    // db can disappear between enqueue and flush; treat this as a normal miss.
    if (!db) {
      batch.forEach(({ waiters }) => waiters.forEach(waiter => waiter.resolve(undefined)));
      return Promise.resolve();
    }

    const currentFlush = (async () => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const values = await Promise.all([
          ...batch.map(({ id }) => tx.store.get(id)),
          tx.done,
        ]);
        const records = values.slice(0, batch.length) as Array<T | undefined>;
        const retrievedIds: string[] = [];

        batch.forEach(({ id, waiters }, index) => {
          const value = records[index];
          if (waiters.some(waiter => waiter.isValid(value))) {
            retrievedIds.push(id);
          }
          waiters.forEach((waiter) => {
            waiter.resolve(waiter.isValid(value) ? value : undefined);
          });
        });

        log(formatIds(batch.map(({ id }) => id), retrievedIds));
      } catch (error) {
        batch.forEach(({ waiters }) => waiters.forEach(waiter => waiter.reject(error)));
      }
    })();

    activeFlush = currentFlush.finally(() => {
      activeFlush = undefined;
      if (pending.size) {
        queueFlush();
      }
    });
    return activeFlush;
  };

  flushBatch = (): Promise<void> => {
    if (activeFlush) {
      return activeFlush;
    }
    if (isDraining || !pending.size) {
      return Promise.resolve();
    }

    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    const batch = [...pending.values()].slice(0, CACHE_READ_MAX_BATCH_SIZE);
    batch.forEach(({ id }) => pending.delete(id));
    return flushEntries(batch);
  };

  const read = (id: string, isValid: ReadWaiter<T>['isValid']) => {
    const promise = new Promise<T | undefined>((resolve, reject) => {
      let request = pending.get(id);
      if (!request) {
        request = { id, waiters: [] };
        pending.set(id, request);
      }
      request.waiters.push({ resolve, reject, isValid });

      if (!isDraining && pending.size >= CACHE_READ_MAX_BATCH_SIZE) {
        void flushBatch();
      } else {
        queueFlush();
      }
    });

    return promise;
  };

  // Writes drain only queued reads for the ids being written, so they observe
  // the pre-write value. Unrelated reads stay queued and keep batching.
  const flushPending = async (ids: string[]) => {
    const snapshot = ids
      .map(id => pending.get(id))
      .filter((entry): entry is PendingRead<T> => !!entry);
    if (!snapshot.length) {
      return;
    }
    snapshot.forEach(({ id }) => pending.delete(id));
    isDraining = true;
    try {
      if (activeFlush) {
        await activeFlush;
      }
      for (let offset = 0; offset < snapshot.length; offset += CACHE_READ_MAX_BATCH_SIZE) {
        const batch = snapshot.slice(offset, offset + CACHE_READ_MAX_BATCH_SIZE);
        await flushEntries(batch);
      }
    } finally {
      isDraining = false;
      if (pending.size) {
        queueFlush();
      }
    }
  };

  const reset = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    const error = new Error('Cache read scheduler reset');
    pending.forEach(({ waiters }) => waiters.forEach(waiter => waiter.reject(error)));
    pending.clear();
  };

  return { read, flushPending, reset };
};

export const useCacheStore = defineStore('cache', () => {
  const schemaVersion = computed(() => 1);
  const isPersistenceSupported = computed(
    () => typeof window !== 'undefined' && 'indexedDB' in window,
  );
  const db = shallowRef<IDBPDatabase<CacheSchema>>();
  const { $logger } = useNuxtApp();
  const memLog = $logger['cache:memory'];
  const diskLog = $logger['cache:disk'];
  const mediaLog = $logger['cache:media'];

  const upgrade = (db: IDBPDatabase<CacheSchema>, oldVersion: number) => {
    switch (oldVersion) {
      case 0:
        db.createObjectStore('files', { keyPath: 'id' });
        db.createObjectStore('media', { keyPath: 'id' });
    }
  };

  const open = async () => {
    if (typeof window === 'undefined') {
      // SSR
      return;
    }

    if (!isPersistenceSupported.value) {
      console.error(new Error('Cache is not supported in this browser'));
      const notificationStore = useNotificationStore();
      notificationStore.error('Drive file caching is not supported in this browser. Performance will be degraded. (Are you in incognito mode?)');
      return;
    }

    db.value = await openDB<CacheSchema>('mirror-table-cache', schemaVersion.value, {
      upgrade,
      terminated: () => {
        const e = new Error('Cache terminated unexpectedly');
        console.error(e);
        const notificationStore = useNotificationStore();
        notificationStore.error(e.message);
      },
    });
  };

  const _files = ref<Record<string, DriveFile>>({});
  const _media = ref<Record<string, RawMediaObject>>({});
  const fileReads = createReadScheduler<DriveFile>(() => db.value, 'files', diskLog);
  const mediaReads = createReadScheduler<RawMediaObject>(() => db.value, 'media', mediaLog);

  const setFiles = async (files: DriveFile[]) => {
    if (files.some(file => !file.id)) {
      throw new Error('Cannot cache file without ID');
    }

    await fileReads.flushPending(files.map(file => file.id));
    files.forEach((file) => {
      _files.value[file.id] = file;
    });

    if (!db.value) {
      return;
    }

    const tx = db.value.transaction('files', 'readwrite');
    await Promise.all(files.map(file => tx.store.put(toRaw(file))));
    await tx.done;
  };

  const deleteFiles = async (ids: string[]) => {
    await fileReads.flushPending(ids);
    ids.forEach((id) => {
      delete _files.value[id];
    });

    if (!db.value) {
      return;
    }

    const tx = db.value.transaction('files', 'readwrite');
    await Promise.all(ids.map(id => tx.store.delete(id)));
    await tx.done;
  };

  const getFiles = async (
    ids: string[],
    options?: GetFilesOptions,
  ) => {
    let cachedFiles = ids.map(id => _files.value[id]).filter(isDriveFile);

    if (options?.TTL && options.TTL > 0) {
      const now = Date.now();
      cachedFiles = cachedFiles.filter(file => file.loadedAt + options.TTL! > now);
    }

    if (!db.value || cachedFiles.length === ids.length || options?.skipDisk) {
      memLog(formatIds(ids, cachedFiles.map(file => file.id)));
      return cachedFiles;
    }

    const files = await Promise.all(ids.map(id => fileReads.read(id, isDriveFile)));
    const result = files.filter(isDriveFile);

    result.forEach((file) => {
      _files.value[file.id] = file;
    });

    return result;
  };

  const setMedia = async (media: RawMediaObject[]) => {
    if (media.some(file => !file.id)) {
      throw new Error('Cannot cache file without ID');
    }

    await mediaReads.flushPending(media.map(file => file.id));
    if (db.value) {
      // save the media to the cache
      const tx = db.value.transaction('media', 'readwrite');
      await Promise.all(media.map(file => tx.store.put(file)));
      await tx.done;
    } else {
      // fallback to in-memory cache
      media.forEach((file) => {
        _media.value[file.id] = file;
      });
    }
  };

  const deleteMedia = async (ids: string[]) => {
    await mediaReads.flushPending(ids);
    ids.forEach((id) => {
      delete _media.value[id];
    });

    if (!db.value) {
      return;
    }

    const tx = db.value.transaction('media', 'readwrite');
    await Promise.all(ids.map(id => tx.store.delete(id)));
    await tx.done;
  };

  const getMedia = async (id: string, md5Checksum?: string) => {
    if (!db.value) {
      const media = _media.value[id];
      if (media && (!md5Checksum || media.md5Checksum === md5Checksum)) {
        return media;
      }

      return;
    }

    return mediaReads.read(id, (media): media is RawMediaObject => !!media && (!md5Checksum || media.md5Checksum === md5Checksum));
  };

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      fileReads.reset();
      mediaReads.reset();
    });
  }

  return {
    schemaVersion,
    isPersistenceSupported,
    db,
    files: _files,
    open,
    setFiles,
    getFiles,
    deleteFiles,
    setMedia,
    getMedia,
    deleteMedia,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCacheStore, import.meta.hot));
}
