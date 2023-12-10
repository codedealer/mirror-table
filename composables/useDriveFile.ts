import type { MaybeRef } from 'vue';
import type { AppPropertiesType, DriveAsset, DriveFile, DriveImage } from '~/models/types';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export interface DriveFileOptions {
  activelyLoad?: boolean
  appPropertiesType?: AppPropertiesType
}

export const useDriveFile = <T extends DriveAsset | DriveFile | DriveImage>
  (
    id: MaybeRef<string>,
    options: DriveFileOptions = {
      activelyLoad: false,
    },
  ) => {
  const driveStore = useDriveStore();
  const { isReady } = toRefs(driveStore);

  const file = ref<T>();
  const error = shallowRef<unknown>(null);
  const isLoading = ref(false);
  const idRef = ref(id);

  const driveFileStore = useDriveFileStore();

  const loadFile = async (id: string) => {
    console.warn('File load triggered', id);

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

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watchEffect(async () => {
    if (!isReady.value || !idRef.value) {
      error.value = null;
      file.value = undefined;
      isLoading.value = false;
      return;
    }

    if (!Object.hasOwn(driveFileStore.files, idRef.value)) {
      if (options.activelyLoad) {
        await loadFile(idRef.value);
      } else {
        error.value = null;
        file.value = undefined;
        return;
      }
    }

    const driveFile = driveFileStore.files[idRef.value];

    if (
      options.appPropertiesType &&
      driveFile.appProperties?.type !== options.appPropertiesType
    ) {
      error.value = new Error(`File ${idRef.value} is not of type ${options.appPropertiesType}`);
      file.value = undefined;
      return;
    }

    file.value = driveFile as T;
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
