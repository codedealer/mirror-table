import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { CacheSchema, DriveFile, RawMediaObject } from '~/models/types';
import { isDriveFile } from '~/models/types';

export const useCacheStore = defineStore('cache', () => {
  const schemaVersion = computed(() => 1);
  const isPersistenceSupported = computed(
    () => typeof window !== 'undefined' && 'indexedDB' in window,
  );
  const db = shallowRef<IDBPDatabase<CacheSchema>>();

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
    await Promise.all(files.map(file => tx.store.put(file)));
    await tx.done;
  };

  const getFiles = async (ids: string[]) => {
    const cachedFiles = ids.map(id => _files.value[id]).filter(isDriveFile);
    if (!db.value || cachedFiles.length === ids.length) {
      return cachedFiles;
    }

    const tx = db.value.transaction('files', 'readonly');
    const files = await Promise.all(ids.map(id => tx.store.get(id)));
    await tx.done;

    const result = files.filter(isDriveFile);

    result.forEach((file) => {
      _files.value[file.id] = file;
    });

    return result;
  };

  return {
    schemaVersion,
    isPersistenceSupported,
    db,
    files: _files,
    open,
    setFiles,
    getFiles,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCacheStore, import.meta.hot));
}
