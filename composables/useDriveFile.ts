import type { Ref } from 'vue';
import type { DataRetrievalStrategy, DriveFile } from '~/models/types';

export interface DriveFileOptions<T extends DriveFile> {
  strategy: DataRetrievalStrategy
  predicate?: (obj: DriveFile) => obj is T
}

export const useDriveFile = <T extends DriveFile>
  (
    idRef: Ref<string>,
    options: DriveFileOptions<T> = {
      strategy: DataRetrievalStrategies.OPTIMISTIC_CACHE,
    },
  ) => {
  const driveStore = useDriveStore();
  const { isReady } = storeToRefs(driveStore);
  const driveFileStore = useDriveFileStore();
  const { files } = storeToRefs(driveFileStore);

  const file = ref<T>();
  const error = shallowRef<unknown>(null);

  watch([isReady, idRef], async ([isReadyValue, idRefValue]) => {
    if (!isReadyValue) {
      return;
    }

    if (!idRefValue) {
      file.value = undefined;
      error.value = null;
      return;
    }

    try {
      // make sure the file is in the registry
      await driveFileStore.getFile(idRefValue, options.strategy);
    } catch (e) {
      error.value = e;
      file.value = undefined;
    }
  }, { immediate: true });

  watch(() => files.value[idRef.value], (driveFile) => {
    if (!driveFile) {
      file.value = undefined;
      return;
    }

    if (options.predicate && !options.predicate(driveFile)) {
      file.value = undefined;
      error.value = new Error(`File ${idRef.value} is not of enforced type`);
      return;
    }

    file.value = driveFile as T;
  }, { immediate: true });

  const isLoading = computed(() => {
    return file.value?.loading ?? false;
  });

  const label = computed(() => {
    if (!file.value) {
      return '[no data]';
    }

    if (file.value?.name && file.value?.fileExtension) {
      return stripFileExtension(file.value?.name);
    }

    return file.value?.name ?? '';
  });

  return { file, error, isLoading, label };
};
