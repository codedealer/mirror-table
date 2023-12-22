import {
  isSceneElementCanvasObjectAsset,
} from '~/models/types';
import type {
  CanvasElementStateLoadable, DriveAsset, SceneElementCanvasObjectAsset,
  Stateful,
} from '~/models/types';

export const useCanvasAsset = (
  element: Ref<Stateful<SceneElementCanvasObjectAsset, CanvasElementStateLoadable>>,
) => {
  const driveFileStore = useDriveFileStore();
  const canvasElementsStore = useCanvasElementsStore();

  const image = ref<HTMLImageElement | undefined>();
  const error = shallowRef<unknown>(null);

  const {
    file: asset,
    isLoading: fileIsLoading,
    error: fileError,
  } = useDriveFile<DriveAsset>(
    toRef(() => {
      return isSceneElementCanvasObjectAsset(element.value)
        ? element.value.asset.id
        : '';
    }), {
      activelyLoad: true,
      appPropertiesType: AppPropertiesTypes.ASSET,
    });

  const returnObject = {
    image,
    error,
    asset,
  };

  watchEffect(() => {
    error.value = fileError.value;
  });

  let attempt = 0;
  watch([asset], async ([assetValue]) => {
    if (
      !assetValue ||
      element.value._state.loading ||
      element.value._state.loaded ||
      attempt > 0
    ) {
      return;
    }

    if (!assetValue.appProperties.preview || !assetValue.appProperties.preview.id) {
      error.value = new Error(`Asset ${assetValue.id} has no preview`);

      return;
    }

    try {
      canvasElementsStore.updateElementState(element.value.id, { loading: true } as Partial<CanvasElementStateLoadable>);

      const media = await driveFileStore.downloadMedia(
        assetValue.appProperties.preview.id,
        true,
        true,
      );

      const img = new Image();
      img.src = URL.createObjectURL(media);

      image.value = img;

      canvasElementsStore.updateElementState(element.value.id, {
        loaded: true,
      } as Partial<CanvasElementStateLoadable>);
    } catch (e) {
      error.value = e;

      return;
    } finally {
      attempt++;
      canvasElementsStore.updateElementState(element.value.id, {
        loading: false,
      } as Partial<CanvasElementStateLoadable>);
    }
  }, {
    immediate: true,
  });

  return returnObject;
};
