import type { AppPropertiesType, DriveAsset, DriveFile, DriveImage } from '~/models/types';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export interface DriveFileOptions {
  activelyLoad?: boolean
  appPropertiesType?: AppPropertiesType
}

export const useDriveFile = <T extends DriveAsset | DriveFile | DriveImage>
  (
    idRef: Ref<string>,
    options: DriveFileOptions = {
      activelyLoad: false,
    },
  ) => {
  const driveStore = useDriveStore();
  const { isReady } = storeToRefs(driveStore);

  const file = ref<T>();
  const error = shallowRef<unknown>(null);
  const isLoading = ref(false);

  const driveFileStore = useDriveFileStore();

  const loadFile = async (id: string) => {
    error.value = null;
    isLoading.value = true;

    try {
      void await driveFileStore.getFile(id);
    } catch (e) {
      file.value = undefined;
      error.value = e;

      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    } finally {
      isLoading.value = false;
    }
  };

  watch([isReady, idRef], async ([isReadyValue, idRefValue]) => {
    if (!isReadyValue || !idRefValue) {
      error.value = null;
      file.value = undefined;
      isLoading.value = false;

      return;
    }

    if (isLoading.value) {
      console.warn(`File ${idRefValue} is already loading`);
      return;
    }

    if (!Object.hasOwn(driveFileStore.files, idRefValue)) {
      if (options.activelyLoad) {
        await loadFile(idRefValue);

        if (error.value) {
          file.value = undefined;
          return;
        }
      } else {
        error.value = null;
        file.value = undefined;
        return;
      }
    }

    const driveFile = driveFileStore.files[idRefValue];

    if (!driveFile) {
      throw new Error(`File ${idRefValue} was expected but not found`);
    }

    if (
      options.appPropertiesType &&
      driveFile.appProperties?.type !== options.appPropertiesType
    ) {
      error.value = new Error(`File ${idRefValue} is not of type ${options.appPropertiesType}`);
      file.value = undefined;
      return;
    }

    file.value = driveFile as T;
    error.value = null;
  }, {
    immediate: true,
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
