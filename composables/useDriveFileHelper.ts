import type { ComputedRef, MaybeRef } from 'vue';
import type { AppPropertiesType, DriveAsset, DriveFile } from '~/models/types';

export const useDriveFileHelper = <T extends DriveAsset | DriveFile>
  (id: MaybeRef<string>, typeGuard?: AppPropertiesType): {
    file: ComputedRef<T | undefined>
    label: ComputedRef<string>
  } => {
  const idRef = ref(id);

  const driveFileStore = useDriveFileStore();

  const file = computed(() => {
    if (!idRef.value) {
      return;
    }
    const maybeFile = driveFileStore.files[idRef.value];
    if (!maybeFile) {
      return;
    }

    if (!typeGuard) {
      return maybeFile as T;
    }

    if (maybeFile.appProperties?.type === typeGuard) {
      return maybeFile as T;
    }
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

  return {
    file,
    label,
  };
};
