import type { SceneElementCanvasObjectAsset } from '~/models/types';

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

  const modalShow = () => {
    const element = getCanvasAsset();
    if (!element) {
      modalHide();
      return;
    }

    modalContent.value = {
      title: element.asset.title,
      showTitle: element.asset.showTitle,
    };

    modalState.value = true;
  };

  const modalSubmit = async () => {
    const element = getCanvasAsset();

    if (!element) {
      modalHide();
      return;
    }

    if (element.asset.kind !== AssetPropertiesKinds.IMAGE) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Only images are supported for now');
      modalHide();
      return;
    }

    if (!modalContent.value.title) {
      modalContent.value.showTitle = false;
    }

    modalLoading.value = true;

    const sceneStore = useSceneStore();
    await sceneStore.updateElement<SceneElementCanvasObjectAsset>(element.id, {
      asset: {
        showTitle: modalContent.value.showTitle,
        title: modalContent.value.title,
      },
    });

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
