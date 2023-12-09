import type { MaybeRef } from 'vue';

export const useDriveFileHelper = (id: MaybeRef<string>) => {
  const idRef = ref(id);

  const driveFileStore = useDriveFileStore();

  const file = computed(() => {
    if (!idRef.value) {
      return null;
    }
    return driveFileStore.files[idRef.value];
  });

  const isAsset = computed(() => {
    return file.value?.appProperties?.type === AppPropertiesTypes.ASSET;
  });

  const label = computed(() => {
    if (!file.value) {
      return '[no data]';
    }

    if (file.value.name && file.value.fileExtension) {
      return stripFileExtension(file.value.name);
    }

    return file.value.name ?? '';
  });

  return {
    file,
    isAsset,
    label,
  };
};
