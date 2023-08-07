import type { BuildPickerOptions } from '~/models/types';
import ResponseObject = google.picker.ResponseObject;

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

  const builder = await driveStore.getPickerBuilder();

  if (!options.uploadOnly) {
    usePickerViewTemplate(builder, options.template);
  }

  if (options.allowUpload || options.uploadOnly) {
    builder.addView(new window.google.picker.DocsUploadView());
  }

  builder.setCallback((result: ResponseObject) => {
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
