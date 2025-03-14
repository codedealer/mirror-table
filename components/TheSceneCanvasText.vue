<script setup lang="ts">
import type Konva from 'konva';
import type { ComputedRef } from 'vue';
import { computed, toRef } from 'vue';
import type { CanvasElementStateText, ElementContainerConfig, SceneElementCanvasObjectText } from '~/models/types';
import { useCanvasTransformEvents } from '~/composables/useCanvasTransformEvents';

const props = defineProps<{
  element: SceneElementCanvasObjectText
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
    width: props.element.text.width,
    align: props.element.text.align,
    padding: props.element.text.padding,
    textDecoration: props.element.text.textDecoration,
    fontStyle: props.element.text.fontStyle,
    fontVariant: props.element.text.fontVariant,
    x: 0,
    y: 0,
    opacity: props.element.enabled ? 1 : 0.5,
  };
});

const { onNodeTransformEnd } = useCanvasTransformEvents();
const onHover = (e: Konva.KonvaEventObject<PointerEvent>) => {
};
const onHoverOut = (e: Konva.KonvaEventObject<PointerEvent>) => {
};

const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  onNodeTransformEnd(e);
};

const onTransformEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  onNodeTransformEnd(e);
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
    <v-text v-if="textConfig" :config="textConfig" />
  </v-group>
</template>
