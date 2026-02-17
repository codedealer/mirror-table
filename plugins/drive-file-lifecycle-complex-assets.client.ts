import type { AssetProperties } from '~/models/types';
import type {
  DriveFileCreatedEvent,
  DriveFileHardMissingEvent,
  DriveFileSavedEvent,
  DriveFileTrashedEvent,
} from '~/stores/drive-file-store';
import { SceneElementCanvasObjectAssetPropertiesFactory } from '~/models/SceneElementCanvasObjectAsset';
import {
  AssetPropertiesKinds,
  isAssetProperties,
  isSceneElementCanvasObjectAsset,
} from '~/models/types';

let unregisterHooks: Array<() => void> = [];
const hardMissingCleanupInFlight = new Set<string>();
const hardMissingCleanupDone = new Set<string>();

export default defineNuxtPlugin({
  name: 'drive-file-lifecycle-complex-assets',
  setup: () => {
    if (unregisterHooks.length) {
      return;
    }

    const nuxtApp = useNuxtApp();

    unregisterHooks.push(
      nuxtApp.hook('drive-file:created', async ({ fileId, appProperties }: DriveFileCreatedEvent) => {
        if (!isAssetProperties(appProperties) || appProperties.kind !== AssetPropertiesKinds.COMPLEX) {
          return;
        }

        const canvasElementsStore = useCanvasElementsStore();
        const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
          fileId,
          appProperties as AssetProperties,
        );
        await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
      }),
    );

    unregisterHooks.push(
      nuxtApp.hook('drive-file:trashed', async ({ file, restore }: DriveFileTrashedEvent) => {
        const appProperties = file.appProperties;
        if (!isAssetProperties(appProperties) || appProperties.kind !== AssetPropertiesKinds.COMPLEX) {
          return;
        }

        const canvasElementsStore = useCanvasElementsStore();
        const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
          file.id,
          appProperties as AssetProperties,
        );

        const prevSettings = (complexAssetProperties.settings ?? {}) as Record<string, unknown>;
        const { trashed: _trashed, ...restSettings } = prevSettings;
        complexAssetProperties.settings = {
          ...restSettings,
          trashedAt: restore ? null : Date.now(),
        };
        await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
      }),
    );

    unregisterHooks.push(
      nuxtApp.hook('drive-file:saved', async ({ file, appProperties }: DriveFileSavedEvent) => {
        if (!isAssetProperties(appProperties) || appProperties.kind !== AssetPropertiesKinds.COMPLEX) {
          return;
        }

        const canvasElementsStore = useCanvasElementsStore();
        const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
          file.id,
          appProperties as AssetProperties,
        );
        await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
      }),
    );

    unregisterHooks.push(
      nuxtApp.hook('drive-file:hard-missing', async ({ id, cachedFile }: DriveFileHardMissingEvent) => {
        if (hardMissingCleanupDone.has(id) || hardMissingCleanupInFlight.has(id)) {
          return;
        }

        const canvasElementsStore = useCanvasElementsStore();
        const hasRegistryEntry = Boolean(canvasElementsStore.assetPropertiesRegistry[id]);
        const isComplexFromCachedFile = isAssetProperties(cachedFile?.appProperties)
          && cachedFile.appProperties.kind === AssetPropertiesKinds.COMPLEX;
        const isReferencedByComplexElement = canvasElementsStore.canvasElements
          .filter(isSceneElementCanvasObjectAsset)
          .some(element => element.asset.kind === AssetPropertiesKinds.COMPLEX && element.asset.id === id);

        if (!(hasRegistryEntry || isComplexFromCachedFile || isReferencedByComplexElement)) {
          return;
        }

        hardMissingCleanupInFlight.add(id);
        try {
          await canvasElementsStore.removeComplexAssetProperties(id);
          hardMissingCleanupDone.add(id);
        } finally {
          hardMissingCleanupInFlight.delete(id);
        }
      }),
    );

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        unregisterHooks.forEach(unregister => unregister());
        unregisterHooks = [];
        hardMissingCleanupInFlight.clear();
        hardMissingCleanupDone.clear();
      });
    }
  },
});
