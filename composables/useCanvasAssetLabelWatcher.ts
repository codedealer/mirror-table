import type { DriveAsset, SceneElementCanvasObjectAsset } from '~/models/types';
import { AssetPropertiesKinds } from '~/models/types';

/**
 * Assets of kind "complex" have a label that is linked to the drive file.
 * For optimization purposes, the label is stored in the canvas element as well.
 * But in the event of a drive file being changed while the element is on the canvas,
 * the label in the canvas element needs to be updated. This needs to be done only by the owner. Watching the drive file is the simplest way I can think of as the alternative is to update all canvas elements that have the same drive file every time it is changed.
 */
export const useCanvasAssetLabelWatcher = (
  element: Ref<SceneElementCanvasObjectAsset>,
) => {
  const tableStore = useTableStore();
  const sceneStore = useSceneStore();

  if (
    tableStore.mode !== TableModes.OWN ||
    element.value.asset.kind !== AssetPropertiesKinds.COMPLEX
  ) {
    return;
  }

  const { file } = useDriveFile<DriveAsset>(
    toRef(() => element.value.asset.id),
    {
      strategy: DataRetrievalStrategies.LAZY,
      predicate: isDriveAsset,
    },
  );

  watchEffect(() => {
    if (!file.value) {
      return;
    }

    if (
      file.value.appProperties.showTitle !== element.value.asset.showTitle ||
      file.value.appProperties.title !== element.value.asset.title
    ) {
      console.log(`Syncing canvas element label for ${element.value.asset.id}`);

      void sceneStore.updateElement<SceneElementCanvasObjectAsset>(element.value.id, {
        asset: {
          showTitle: file.value.appProperties.showTitle,
          title: file.value.appProperties.title,
        },
      });
    }
  });
};
