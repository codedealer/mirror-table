import type { BuildPickerOptions } from '~/models/types';
import { folderExists } from '~/utils/driveOps';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';

const buildPickerOptionsDefaults = {
  template: 'all' as const,
  allowMultiSelect: false,
  allowUpload: true,
  uploadOnly: false,
  callback: () => {},
};

const buildPicker = async (opts: BuildPickerOptions): Promise<google.picker.Picker> => {
  const options = { ...buildPickerOptionsDefaults, ...opts };
  const userStore = useUserStore();
  const driveStore = useDriveStore();

  if (
    !driveStore.isReady ||
    !userStore.isAuthenticated ||
    !userStore.profile
  ) {
    throw new Error('Calling Picker API when the API is not ready or user is not authenticated');
  }

  await driveWorkspaceSentinel();

  // check if the parent folder exists
  if (options.parentId === '') {
    options.parentId = userStore.profile.settings.driveFolderId;
  }

  if (options.parentId !== userStore.profile.settings.driveFolderId) {
    if (!(await folderExists(options.parentId))) {
      throw new Error('Folder does not exist');
    }
  }

  const builder = await driveStore.getPickerBuilder();

  if (!options.uploadOnly) {
    usePickerViewTemplate(builder, options);
  }

  if (options.allowUpload || options.uploadOnly) {
    builder.addView(
      new window.google.picker.DocsUploadView().setParent(options.parentId),
    );
  }

  builder.setCallback(options.callback);

  const picker = builder.build();
  picker.setVisible(true);
  return picker;
};

export const usePicker = () => {
  return {
    buildPicker,
  };
};
