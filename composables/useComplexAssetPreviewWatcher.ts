import type { Ref } from 'vue';
import type {
  CanvasElementStateAsset,
  SceneElementCanvasObjectAsset,
  SceneElementCanvasObjectAssetProperties,
} from '~/models/types';
import { watch } from 'vue';

/*
  Handle an edge case where a complex asset's preview is changed
  while the elements with that asset are already on the scene.
 */
export function useComplexAssetPreviewWatcher(
  element: Ref<SceneElementCanvasObjectAsset>,
  properties: Ref<SceneElementCanvasObjectAssetProperties>,
  updateState: (state: Partial<CanvasElementStateAsset>) => void,
) {
  const sceneStore = useSceneStore();
  const tableStore = useTableStore();

  watch(
    () => properties.value.preview?.id,
    (newPreviewId) => {
      if (element.value.asset.kind !== AssetPropertiesKinds.COMPLEX) {
        return;
      }

      if (!newPreviewId || !properties.value.preview) {
        return;
      }

      // Only react when asset_properties is out of sync with the element snapshot.
      if (newPreviewId === element.value.asset.preview.id) {
        return;
      }

      // Reset preview state so it will be reloaded by the batcher.
      updateState({
        loaded: false,
        loading: false,
      });

      if (tableStore.mode !== TableModes.OWN) {
        return;
      }

      // asset_properties is the ground truth for complex assets.
      // Sync the element snapshot (preview id) and preview-derived defaults.
      void sceneStore.updateElement<SceneElementCanvasObjectAsset>(element.value.id, {
        container: {
          width: properties.value.preview.nativeWidth,
          height: properties.value.preview.nativeHeight,
          rotation: properties.value.preview.rotation,
          scaleX: properties.value.preview.scaleX,
          scaleY: properties.value.preview.scaleY,
        },
        asset: {
          preview: {
            id: newPreviewId,
          },
        },
      });
    },
    { immediate: true },
  );
}
