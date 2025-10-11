<script setup lang="ts">
import type Konva from 'konva';
import type { ComputedRef } from 'vue';
import type {
  CanvasElementStateText,
  ElementContainerConfig,
  SceneElementCanvasObjectText,
} from '~/models/types';
import { computed, toRef } from 'vue';
import { useCanvasElementPointerEvents } from '~/composables/useCanvasElementPointerEvents';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';

const props = defineProps<{
  element: SceneElementCanvasObjectText;
}>();

const layersStore = useLayersStore();
const canvasElementsStore = useCanvasElementsStore();

// Create and register state
const state = computed<CanvasElementStateText | undefined>(() => {
  const s = canvasElementsStore.canvasElementsStateRegistry[props.element.id];
  if (!s) {
    return;
  }

  if (!isCanvasElementStateText(s)) {
    // Recreating the state will make it valid but won't reload drive files
    canvasElementsStore.createElementState(props.element.id);
    return;
  }

  return s;
});

const updateState = (update: Partial<CanvasElementStateText>) => {
  canvasElementsStore.updateElementState<CanvasElementStateText>(
    props.element.id,
    update,
  );
};

useSelectableStateWatcher(
  toRef(() => props.element),
  state,
  updateState,
);

// Container configuration
const containerConfig: ComputedRef<ElementContainerConfig> = computed(() => {
  if (!state.value) {
    return props.element.container;
  }

  return {
    ...props.element.container,
    draggable: state.value?.selectable && state.value?.selected,
    visible: layersStore.hideHiddenElements ? props.element.enabled : true,
    listening: layersStore.hideHiddenElements ? props.element.enabled : true,
  };
});

// Backdrop configuration
const backdropConfig = computed(() => {
  return {
    width: props.element.container.width,
    height: props.element.container.height,
    fill: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white background
    opacity: props.element.enabled ? 1 : 0.5,
    x: 0,
    y: 0,
  };
});

// Text configuration
const textConfig = computed(() => {
  if (!state.value) {
    return null;
  }

  return {
    text: props.element.text.text,
    fontSize: props.element.text.fontSize,
    fontFamily: props.element.text.fontFamily,
    fill: props.element.text.fill,
    width: props.element.container.width,
    height: props.element.container.height,
    align: props.element.text.align || 'center',
    padding: 10,
    textDecoration: props.element.text.textDecoration,
    fontStyle: props.element.text.fontStyle,
    fontVariant: props.element.text.fontVariant,
    wrap: 'word',
    x: 0,
    y: 0,
    opacity: props.element.enabled ? 1 : 0.5,
  };
});

const { onNodeTransformEnd } = useCanvasTransformEvents();
const { onHover, onHoverOut } = useCanvasElementPointerEvents(state);

const canvasStageStore = useCanvasStageStore();
const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  onHover(e);
  // transform handled by the stage after event bubbling
};

const onTransformEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
  onHover(e);
  // special case for text to avoid scaling
  // apparently, transform events don't bubble, but just in case
  e.cancelBubble = true;

  const node = e.target as Konva.Node;

  node.setAttrs({
    scaleX: 1,
    scaleY: 1,
    width: Math.max(32, node.width() * node.scaleX()),
    height: Math.max(32, node.height() * node.scaleY()),
  });

  await onNodeTransformEnd(e);

  canvasStageStore.imageTransformer?.forceUpdate();
};
</script>

<template>
  <v-group
    :config="containerConfig"
    @dragstart="onHoverOut"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
    @transformstart="onHoverOut"
    @pointerover="onHover"
    @pointerout="onHoverOut"
  >
    <v-rect :config="backdropConfig" />
    <v-text v-if="textConfig" :config="textConfig" />
  </v-group>
</template>
