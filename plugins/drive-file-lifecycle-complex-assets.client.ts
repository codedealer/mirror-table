import type { AssetProperties } from '~/models/types';
import type { DriveFileLifecycleHandler } from '~/stores/drive-file-store';
import { SceneElementCanvasObjectAssetPropertiesFactory } from '~/models/SceneElementCanvasObjectAsset';
import { AssetPropertiesKinds, isAssetProperties } from '~/models/types';

let unregister: (() => void) | undefined;

export default defineNuxtPlugin(() => {
  if (unregister) {
    return;
  }

  const driveFileStore = useDriveFileStore();
  const canvasElementsStore = useCanvasElementsStore();

  const handler: DriveFileLifecycleHandler = {
    appliesTo: (appProperties) => {
      return isAssetProperties(appProperties) && appProperties.kind === AssetPropertiesKinds.COMPLEX;
    },

    onCreated: async ({ fileId, appProperties }) => {
      const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
        fileId,
        appProperties as AssetProperties,
      );
      await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
    },

    onTrashed: async ({ file, restore }) => {
      const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
        file.id,
        file.appProperties as AssetProperties,
      );

      const prevSettings = (complexAssetProperties.settings ?? {}) as Record<string, unknown>;
      const { trashed: _trashed, ...restSettings } = prevSettings;
      complexAssetProperties.settings = {
        ...restSettings,
        trashedAt: restore ? null : Date.now(),
      };
      await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
    },

    onSaved: async ({ file, appProperties }) => {
      const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
        file.id,
        appProperties as AssetProperties,
      );
      await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
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
