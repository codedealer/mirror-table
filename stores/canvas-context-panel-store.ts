import type { AssetProperties, SceneElementCanvasObjectAsset, SceneElementCanvasObjectText } from '~/models/types';
import updateComplexAssetProperties from '~/utils/updateComplexAssetProperties';

export const useCanvasContextPanelStore = defineStore('canvas-context-panel', () => {
  const visible = ref(false);
  const modalState = ref(false);
  const modalLoading = ref(false);

  const modalContent = ref({
    title: '',
    showTitle: false,
  });

  // Text edit modal state
  const textModalState = ref(false);
  const textModalLoading = ref(false);
  const textModalElementId = ref('');
  const textModalContent = ref({
    text: '',
    align: 'center' as 'left' | 'center' | 'right',
    fill: '#000000',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
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

  const getCanvasTextElement = (): SceneElementCanvasObjectText | undefined => {
    if (!textModalElementId.value) {
      return undefined;
    }

    const canvasElementsStore = useCanvasElementsStore();
    const element = canvasElementsStore.canvasElements.find(element => element.id === textModalElementId.value);

    if (!element) {
      return undefined;
    }

    if (!isSceneElementCanvasObjectText(element)) {
      return undefined;
    }

    return element;
  };

  const textModalHide = () => {
    textModalState.value = false;
    textModalElementId.value = '';
    textModalContent.value = {
      text: '',
      align: 'center',
      fill: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      fontSize: 20,
    };
  };

  const textModalShow = (id: string) => {
    if (!id) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Unsafe open of the modal. Id might not be set.');
      return;
    }

    textModalElementId.value = id;
    const element = getCanvasTextElement();
    if (!element) {
      textModalHide();
      return;
    }

    textModalContent.value = {
      text: element.text.text || '',
      align: (element.text.align as 'left' | 'center' | 'right') || 'center',
      fill: (element.text.fill as string) || '#000000',
      backgroundColor: (element.text.backgroundColor as string) || 'rgba(255, 255, 255, 0.8)',
      fontSize: (element.text.fontSize as number) || 20,
    };

    textModalState.value = true;
  };

  const textModalSubmit = async () => {
    const element = getCanvasTextElement();

    if (!element) {
      const notificationStore = useNotificationStore();
      notificationStore.error('Text element not found');
      textModalHide();
      return;
    }

    textModalLoading.value = true;

    try {
      const sceneStore = useSceneStore();
      await sceneStore.updateElement<SceneElementCanvasObjectText>(element.id, {
        text: {
          ...element.text,
          text: textModalContent.value.text,
          align: textModalContent.value.align,
          fill: textModalContent.value.fill,
          backgroundColor: textModalContent.value.backgroundColor,
          fontSize: textModalContent.value.fontSize,
        },
      });
    } catch (e) {
      const notificationStore = useNotificationStore();
      notificationStore.error(`Failed to update text: ${extractErrorMessage(e)}`);
    }

    textModalLoading.value = false;
    textModalHide();
  };

  return {
    modalState,
    modalLoading,
    modalContent,
    textModalState,
    textModalLoading,
    textModalContent,
    visible,
    position,
    elementId,
    show,
    hide,
    modalShow,
    modalHide,
    modalSubmit,
    textModalShow,
    textModalHide,
    textModalSubmit,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCanvasContextPanelStore, import.meta.hot));
}
