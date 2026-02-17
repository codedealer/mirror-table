import type { DriveFileTrashedEvent } from '~/stores/drive-file-store';
import { isWidgetProperties } from '~/models/types';

let unregisterHooks: Array<() => void> = [];

export default defineNuxtPlugin({
  name: 'drive-file-lifecycle-widgets',
  setup: () => {
    if (unregisterHooks.length) {
      return;
    }

    const nuxtApp = useNuxtApp();

    unregisterHooks.push(
      nuxtApp.hook('drive-file:trashed', async ({ file, restore }: DriveFileTrashedEvent) => {
        const properties = file.appProperties;
        if (!isWidgetProperties(properties) || !properties.firestoreId) {
          return;
        }

        const widgetStore = useWidgetStore();
        await widgetStore.updateWidget(properties.firestoreId, { trashed: !restore });
      }),
    );

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        unregisterHooks.forEach(unregister => unregister());
        unregisterHooks = [];
      });
    }
  },
});
