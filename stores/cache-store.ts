import type { IDBPDatabase } from 'idb';
import type { CacheSchema, DriveFile, GetFilesOptions, RawMediaObject } from '~/models/types';

import colors from 'ansi-colors';
import { openDB } from 'idb';
import { isDriveFile } from '~/models/types';

const { green, red, yellow } = colors;

const formatIds = (
  requested: string[] | number[],
  retrieved: string[] | number[],
) => {
  let result = '';
  const hitMsg = retrieved.length === requested.length
    ? `${green('HIT')}`
    : (retrieved.length > 0 ? `${yellow('PARTIAL HIT')}` : `${red('MISS')}`);
  result += `[${hitMsg}] (${retrieved.length}/${requested.length}):\n`;

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

  const setFiles = async (files: DriveFile[]) => {
    if (files.some(file => !file.id)) {
      throw new Error('Cannot cache file without ID');
    }

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

    const tx = db.value.transaction('files', 'readonly');
    const files = await Promise.all(ids.map(id => tx.store.get(id)));

    const result = files.filter(isDriveFile);

    result.forEach((file) => {
      _files.value[file.id] = file;
    });

    diskLog(formatIds(ids, result.map(file => file.id)));

    return result;
  };

  const setMedia = async (media: RawMediaObject[]) => {
    if (media.some(file => !file.id)) {
      throw new Error('Cannot cache file without ID');
    }

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

  const getMedia = async (id: string, md5Checksum?: string) => {
    if (!db.value) {
      const media = _media.value[id];
      if (media && (!md5Checksum || media.md5Checksum === md5Checksum)) {
        return media;
      }

      return;
    }

    const tx = db.value.transaction('media', 'readonly');
    const media = await tx.store.get(id);

    if (!media || (md5Checksum && media.md5Checksum !== md5Checksum)) {
      mediaLog(`[${red('MISS')}]\n${id}`);
      return;
    }

    mediaLog(`[${green('HIT')}]\n${id}`);

    return media;
  };

  return {
    schemaVersion,
    isPersistenceSupported,
    db,
    files: _files,
    open,
    setFiles,
    getFiles,
    setMedia,
    getMedia,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCacheStore, import.meta.hot));
}
