import type { AssetProperties, SceneElementCanvasObjectAsset } from '~/models/types';
import updateComplexAssetProperties from '~/utils/updateComplexAssetProperties';

export const useCanvasContextPanelStore = defineStore('canvas-context-panel', () => {
  const visible = ref(false);
  const modalState = ref(false);
  const modalLoading = ref(false);

  const modalContent = ref({
    title: '',
    showTitle: false,
  });

  const position = ref({
    x: 0,
    y: 0,
  });

  const elementId = ref('');

  const show = (id: string, x: number, y: number) => {
    elementId.value = id;
    position.value = {
      x,
      y,
    };
    visible.value = true;
  };

  const hide = () => {
    elementId.value = '';
    visible.value = false;
  };

  const modalHide = () => {
    modalState.value = false;
    modalContent.value = {
      title: '',
      showTitle: false,
    };
    hide();
  };

  const getCanvasAsset = (): SceneElementCanvasObjectAsset | undefined => {
    if (!elementId.value) {
      return undefined;
    }

    const canvasElementsStore = useCanvasElementsStore();
    const element = canvasElementsStore.canvasElements.find(element => element.id === elementId.value);

    if (!element || !isSceneElementCanvasObjectAsset(element)) {
      return undefined;
    }

    return element;
  };

  const modalShow = (id: string) => {
    if (!id) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Unsafe open of the modal. Id might not be set.');
      return;
    }

    elementId.value = id;
    const element = getCanvasAsset();
    if (!element) {
      modalHide();
      return;
    }

    const { properties } = useCanvasAssetProperties(ref(element));

    modalContent.value = {
      title: properties.value.title,
      showTitle: properties.value.showTitle,
    };

    modalState.value = true;
  };

  const modalSubmit = async () => {
    const element = getCanvasAsset();

    if (!element) {
      modalHide();
      return;
    }

    if (!modalContent.value.title) {
      modalContent.value.showTitle = false;
    }

    modalLoading.value = true;

    if (element.asset.kind === AssetPropertiesKinds.IMAGE) {
      const sceneStore = useSceneStore();
      await sceneStore.updateElement<SceneElementCanvasObjectAsset>(element.id, {
        asset: {
          showTitle: modalContent.value.showTitle,
          title: modalContent.value.title,
        },
      });
    } else if (element.asset.kind === AssetPropertiesKinds.COMPLEX) {
      const { properties } = useCanvasAssetProperties(ref(element));
      const payload: AssetProperties = {
        type: properties.value.type,
        title: modalContent.value.title,
        showTitle: modalContent.value.showTitle,
        kind: properties.value.kind,
        preview: properties.value.preview,
      };
      await updateComplexAssetProperties(properties.value.id, payload);
    } else {
      const notificationStore = useNotificationStore();
      notificationStore.error(`The type of the asset is not supported: ${element.asset.kind}`);
    }

    modalLoading.value = false;
    modalHide();
  };

  return {
    modalState,
    modalLoading,
    modalContent,
    visible,
    position,
    elementId,
    show,
    hide,
    modalShow,
    modalHide,
    modalSubmit,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasContextPanelStore, import.meta.hot));
}
