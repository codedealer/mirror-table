import { acceptHMRUpdate, defineStore } from 'pinia';
import type { DriveTreeNode } from '~/models/types';
import { DriveFileExtensions } from '~/models/types';

export const useDriveTreeModalStore = defineStore('drive-tree-modal', () => {
  const modalState = ref(false);
  const loading = ref(false);
  const formTitle = ref('');
  const fileName = ref('');
  const mimeType = ref<typeof DriveMimeTypes[keyof typeof DriveMimeTypes]>();
  const fileOptions = ref<string[]>([]);
  const fileParent = ref<DriveTreeNode>();
  const filePath = ref<string[]>([]);

  const cancel = () => {
    formTitle.value = '';
    fileName.value = '';
    mimeType.value = undefined;
    fileParent.value = undefined;
    filePath.value = [];
    fileOptions.value = [];
  };

  const show = (
    title: string,
    type: typeof DriveMimeTypes[keyof typeof DriveMimeTypes],
    parent: DriveTreeNode,
    path?: string[],
    options?: string[],
  ) => {
    cancel();

    formTitle.value = title;
    mimeType.value = type;
    fileParent.value = parent;
    filePath.value = path ?? [];
    fileOptions.value = options ?? [];

    modalState.value = true;
  };

  const hide = () => {
    cancel();
    modalState.value = false;
  };

  const createFile = async () => {
    const filename = fileName.value.trim();
    if (!filename) {
      const notificationStore = useNotificationStore();
      notificationStore.error('File name is required.');
      return;
    }

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
      fileName.value = `${filename}.${mimeType.value}`;
    }

    const driveTreeStore = useDriveTreeStore();

    loading.value = true;

    const result = await driveTreeStore.createChild(fileName.value, fileParent.value, filePath.value);

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
