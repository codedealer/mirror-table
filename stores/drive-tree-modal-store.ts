import { acceptHMRUpdate, defineStore } from 'pinia';
import type {
  AppProperties,
  AppPropertiesType,
  AssetPropertiesKind,
  DriveTreeNode,
  SelectOption,
} from '~/models/types';
import { AppPropertiesTypes, DriveFileExtensions } from '~/models/types';
import { AssetPropertiesFactory } from '~/models/AssetProperties';

export const useDriveTreeModalStore = defineStore('drive-tree-modal', () => {
  const modalState = ref(false);
  const loading = ref(false);
  const formTitle = ref('');
  const fileName = ref('');
  const mimeType = ref<typeof DriveMimeTypes[keyof typeof DriveMimeTypes]>();
  const fileOptions = ref<SelectOption[]>([]);
  const selectedOption = ref<SelectOption>();
  const fileParent = ref<DriveTreeNode>();
  const filePath = ref<string[]>([]);
  const fileType = ref<AppPropertiesType>('asset');
  const fileKind = computed<AssetPropertiesKind | undefined>(() => {
    if (fileType.value === AppPropertiesTypes.ASSET) {
      return selectedOption.value?.value as AssetPropertiesKind | undefined;
    }
    return undefined;
  });

  const cancel = () => {
    formTitle.value = '';
    fileName.value = '';
    mimeType.value = undefined;
    fileParent.value = undefined;
    filePath.value = [];
    fileOptions.value = [];
    selectedOption.value = undefined;
  };

  const show = (
    title: string,
    type: typeof DriveMimeTypes[keyof typeof DriveMimeTypes],
    parent: DriveTreeNode,
    path?: string[],
    options?: SelectOption[],
  ) => {
    cancel();

    formTitle.value = title;
    mimeType.value = type;
    fileParent.value = parent;
    filePath.value = path ?? [];
    fileOptions.value = options ?? [];

    if (fileOptions.value.length > 0) {
      selectedOption.value = fileOptions.value[0];
    }

    modalState.value = true;
  };

  const hide = () => {
    cancel();
    modalState.value = false;
  };

  const createFile = async () => {
    let filename = fileName.value.trim();

    if (!fileParent.value) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Parent folder is required.');
      return;
    }

    if (!mimeType.value || !Object.hasOwn(DriveFileExtensions, mimeType.value)) {
      const notificationStore = useNotificationStore();
      notificationStore.error('MIME type is required.');
      return;
    }

    const extension = DriveFileExtensions[mimeType.value];
    if (extension.length > 0) {
      filename = `${filename}.${extension}`;
    }

    const driveTreeStore = useDriveTreeStore();

    loading.value = true;

    const fileOrName = mimeType.value === DriveMimeTypes.FOLDER
      ? filename
      : new File([], filename, { type: mimeType.value });

    let appProperties: AppProperties | undefined;
    // should probably move this out
    if (mimeType.value !== DriveMimeTypes.FOLDER) {
      if (fileType.value === AppPropertiesTypes.ASSET && fileKind.value) {
        appProperties = AssetPropertiesFactory({
          type: AppPropertiesTypes.ASSET,
          kind: fileKind.value,
        });
      } else {
        throw new Error('Not implemented');
      }
    }

    const result = await driveTreeStore.createChild(
      fileOrName,
      fileParent.value,
      filePath.value,
      appProperties,
    );

    loading.value = false;

    result && hide();

    return result;
  };

  return {
    modalState,
    loading,
    formTitle,
    fileName,
    mimeType,
    fileOptions,
    selectedOption,
    fileParent,
    filePath,
    fileKind,
    show,
    hide,
    createFile,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeModalStore, import.meta.hot),
  );
}
