import type { DriveFileLifecycleHandler } from '~/stores/drive-file-store';
import { isWidgetProperties } from '~/models/types';

let unregister: (() => void) | undefined;

export default defineNuxtPlugin(() => {
  if (unregister) {
    return;
  }

  const driveFileStore = useDriveFileStore();

  const handler: DriveFileLifecycleHandler = {
    appliesTo: (appProperties) => {
      return isWidgetProperties(appProperties);
    },

    onTrashed: async ({ file, restore }) => {
      const properties = file.appProperties;
      if (!isWidgetProperties(properties) || !properties.firestoreId) {
        return;
      }

      const widgetStore = useWidgetStore();
      await widgetStore.updateWidget(properties.firestoreId, { trashed: !restore });
    },
  };

  unregister = driveFileStore.registerLifecycleHandler(handler);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      unregister?.();
      unregister = undefined;
    });
  }
});
