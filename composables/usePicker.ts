import type { BuildPickerOptions } from '~/models/types';

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

  if (!driveStore.isReady || !userStore.isAuthenticated) {
    throw new Error('Calling Picker API when the API is not ready or user is not authenticated');
  }

  const { checkParentFolder, createParentFolder } = usePickerParentFolder();

  try {
    await checkParentFolder(options.parentId);
  } catch (e) {
    if (!isInvalidDriveParentFolderError(e)) {
      throw e;
    }

    // show prompt to create a folder
    let newFolderId = options.parentId;
    try {
      const newFolderName = await driveStore.promptToCreateParentFolder() as string;

      // create folder
      newFolderId = await createParentFolder(newFolderName);
    } catch (e) {
      if (typeof e === 'string') {
        // chose the root folder
        newFolderId = e;
      } else {
        throw e;
      }
    }

    const newProfile = structuredClone(toRaw(userStore.profile));
    newProfile!.settings.driveFolderId = newFolderId;
    await userStore.updateProfile(newProfile!);

    options.parentId = newFolderId;
    return buildPicker(options);
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
