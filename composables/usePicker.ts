import type { buildPickerOptions } from '~/models/types';
import { showToastError } from '~/utils/showToastError';

const buildPickerOptionsDefaults = {
  template: 'all' as const,
  allowMultiSelect: false,
  allowUpload: true,
  uploadOnly: false,
};

const buildPicker = async (options: buildPickerOptions) => {
  options = { ...buildPickerOptionsDefaults, ...options };
  const userStore = useUserStore();
  const driveStore = useDriveStore();

  if (!driveStore.isReady || !userStore.isAuthenticated) {
    throw new Error('Calling Picker API when the API is not ready or user is not authenticated');
  }

  let builder: google.picker.PickerBuilder;
  try {
    builder = await driveStore.getPickerBuilder();
  } catch (e) {
    showToastError(e);
    return;
  }

  if (options.allowUpload || options.uploadOnly) {
    builder.addView(new window.google.picker.DocsUploadView());
  }

  const picker = builder.build();
  picker.setVisible(true);
  return picker;
};

export const usePicker = () => {
  return {
    buildPicker,
  };
};
