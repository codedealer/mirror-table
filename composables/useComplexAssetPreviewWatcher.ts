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
  const { $logger } = useNuxtApp();
  const log = $logger['canvas:elements'];

  watch(() => properties.value.preview?.id, (newPreviewId, oldPreviewId) => {
    // Only proceed if we have a complex asset with changed preview
    if (
      element.value.asset.kind !== AssetPropertiesKinds.COMPLEX
      || !newPreviewId
      || newPreviewId === element.value.asset.preview.id
      || !oldPreviewId
    ) {
      return;
    }

    log(`Preview changed for ${element.value.id}:\n${element.value.asset.preview.id} → ${newPreviewId}`);

    // reset the state of the preview
    updateState({
      loaded: false,
      loading: false,
    });

    if (tableStore.mode !== TableModes.OWN) {
      return;
    }

    // this will make every OWNER to update the same object
    log(`Updating ${element.value.id} on the scene`);
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
          id: properties.value.preview.id,
        },
      },
    });
  }, { immediate: true });
}
