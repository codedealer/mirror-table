import type { BuildPickerOptions } from '~/models/types';

const buildPickerOptionsDefaults = {
  template: 'all' as const,
  allowMultiSelect: false,
  allowUpload: true,
  uploadOnly: false,
};

const buildPicker = async (opts: BuildPickerOptions) => {
  const options = { ...buildPickerOptionsDefaults, ...opts };
  const userStore = useUserStore();
  const driveStore = useDriveStore();

  if (!driveStore.isReady || !userStore.isAuthenticated) {
    throw new Error('Calling Picker API when the API is not ready or user is not authenticated');
  }

  const { checkParentFolder, createParentFolder } = usePickerParentFolder();

  try {
    options.parentId = '1KPYxCp6OKW4Q0FUjJwZ3_zeQgiM9lHzz';
    await checkParentFolder(options.parentId);
  } catch (e) {
    if (!isInvalidDriveParentFolderError(e)) {
      throw e;
    }

    // show prompt to create a folder
    let newFolderName = options.parentId;
    let needToCreateFolder = true;
    try {
      newFolderName = await driveStore.promptToCreateParentFolder() as string;
    } catch (e) {
      if (typeof e === 'string') {
        // chose the root folder
        newFolderName = e;
        needToCreateFolder = false;
      } else {
        throw e;
      }
    }

    // create folder
    if (needToCreateFolder) {
      await createParentFolder(newFolderName);
    }
    // TODO: update profile
    throw e;
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

  builder.setCallback((result: google.picker.ResponseObject) => {
    console.log(result);
  });

  const picker = builder.build();
  picker.setVisible(true);
  return picker;
};

export const usePicker = () => {
  return {
    buildPicker,
  };
};
