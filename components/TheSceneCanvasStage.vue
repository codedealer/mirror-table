<script setup lang="ts">
import type Konva from 'konva';
import { onKeyStroke } from '@vueuse/core';
import type { KonvaComponent, SceneElementCanvasObjectAsset } from '~/models/types';
import { TableModes } from '~/models/types';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';
import TheSceneCanvasScreenFrame from '~/components/TheSceneCanvasScreenFrame.vue';

const stage = ref<KonvaComponent<Konva.Node> | null>(null);
const imageTransformer = ref<KonvaComponent<Konva.Transformer> | null>(null);
const selectionRect = ref<KonvaComponent<Konva.Rect> | null>(null);

const canvasStageStore = useCanvasStageStore();
const canvasElementsStore = useCanvasElementsStore();
const sessionStore = useSessionStore();
const tableStore = useTableStore();

const showScreenFrames = computed(() => {
  return tableStore.mode === TableModes.OWN;
});

onMounted(() => {
  canvasStageStore._stageNode = stage.value;
  canvasStageStore._imageTransformerNode = imageTransformer.value;
  canvasStageStore._selectionRectNode = selectionRect.value;
});

const { onNodeTransformEnd, onKonvaEvent } = useCanvasTransformEvents();

const imageTransformerConfig = ref<Konva.TransformerConfig>({
  flipEnabled: false,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  boundBoxFunc: (oldBox, newBox) => {
    // limit resize
    if (newBox.width < 32 || newBox.height < 32) {
      return oldBox;
    }
    return newBox;
  },
});

onKeyStroke(true, async (e) => {
  // only process the event if the target is body or document
  if (
    e.target &&
    'nodeName' in e.target &&
    typeof e.target.nodeName === 'string' &&
    !['BODY', 'HTML'].includes(e.target.nodeName)
  ) {
    return;
  }
  // only process if no modifiers are pressed
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
    return;
  }

  e.preventDefault();

  const selectedElements = canvasElementsStore.selectedElements;
  if (selectedElements.length === 0) {
    return;
  }

  try {
    const sceneStore = useSceneStore();
    if (['Backspace', 'Delete'].includes(e.code)) {
      await sceneStore.removeElements(selectedElements);
    } else if (e.code === 'KeyV') {
      await sceneStore.updateElements(
        selectedElements.map(e => e.id),
        { enabled: !selectedElements[0].enabled },
      );
    }
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error('Failed to process canvas operation');
  }

  // we need to reset the context panel in case the element that triggered it is deleted
  const contextPanelStore = useCanvasContextPanelStore();
  contextPanelStore.hide();
}, {
  dedupe: true,
});

const hotkeyStore = useHotkeyStore();
hotkeyStore.registerHotkey({
  id: 'delete-element',
  key: 'Del',
  description: 'Delete selected elements',
  modifiers: {},
  namespace: 'Canvas',
});
hotkeyStore.registerHotkey({
  id: 'toggle-element',
  key: 'V',
  description: 'Toggle selected elements',
  modifiers: {},
  namespace: 'Canvas',
});
</script>

<template>
  <v-stage
    id="_stage"
    ref="stage"
    :config="canvasStageStore.stageConfig"
    @pointerdown="onKonvaEvent"
    @pointerup="onKonvaEvent"
    @pointermove="onKonvaEvent"
    @dragend="onNodeTransformEnd"
    @transformend="onNodeTransformEnd"
  >
    <v-layer>
      <TheSceneCanvasAsset
        v-for="asset in canvasElementsStore.canvasElements"
        :key="asset.id"
        :element="asset as SceneElementCanvasObjectAsset"
      />

      <v-transformer
        ref="imageTransformer"
        :config="imageTransformerConfig"
      />
      <v-rect ref="selectionRect" :config="{ visible: false }" />

      <v-group v-if="showScreenFrames">
        <TheSceneCanvasScreenFrame
          v-for="session in sessionStore.privateSessions"
          :key="session.sessionId"
          :session-presence="session"
        />
      </v-group>
    </v-layer>
  </v-stage>
</template>

<style scoped lang="scss">

</style>
