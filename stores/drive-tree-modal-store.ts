import type {
  AppProperties,
  AppPropertiesType,
  AssetPropertiesKind,
  DriveTreeNode,
  SelectOption,
  WidgetTemplate,
} from '~/models/types';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { AssetPropertiesFactory } from '~/models/AssetProperties';
import { AppPropertiesTypes, DriveFileExtensions, WidgetTemplates } from '~/models/types';
import { WidgetPropertiesFactory } from '~/models/WidgetProperties';

export const useDriveTreeModalStore = defineStore('drive-tree-modal', () => {
  const modalState = ref(false);
  const loading = ref(false);
  const formTitle = ref('');
  const fileName = ref('');
  const mimeType = ref<typeof DriveMimeTypes[keyof typeof DriveMimeTypes]>();
  const fileOptions = ref<SelectOption[]>([]);
  const selectedOption = ref<SelectOption>();
  const fileParent = ref<DriveTreeNode>();
  const filePath = ref<number[]>([]);

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
    path?: number[],
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
    let fileType: AppPropertiesType | undefined;
    switch (mimeType.value) {
      case DriveMimeTypes.FOLDER:
        break;
      case DriveMimeTypes.MARKDOWN:
        fileType = AppPropertiesTypes.ASSET;
        break;
      case DriveMimeTypes.WIDGET:
        fileType = AppPropertiesTypes.WIDGET;
        break;
      default:
        throw new Error('Not implemented');
    }

    try {
      if (mimeType.value !== DriveMimeTypes.FOLDER) {
        if (fileType === AppPropertiesTypes.ASSET) {
          const fileKind = selectedOption.value?.value as AssetPropertiesKind;
          if (!fileKind || !Object.values(AssetPropertiesKinds).includes(fileKind)) {
            throw new Error('You must choose a type of the asset');
          }

          appProperties = AssetPropertiesFactory({
            type: AppPropertiesTypes.ASSET,
            kind: fileKind,
          });
        } else if (fileType === AppPropertiesTypes.WIDGET) {
          const template = selectedOption.value?.value as WidgetTemplate;
          if (!template || !Object.values(WidgetTemplates).includes(template)) {
            throw new Error('You must choose a template of the widget');
          }

          appProperties = WidgetPropertiesFactory({
            type: AppPropertiesTypes.WIDGET,
            template,
          });
        } else {
          throw new Error('Not implemented');
        }
      }
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));

      loading.value = false;
      return false;
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
    show,
    hide,
    createFile,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveTreeModalStore, import.meta.hot),
  );
}
