<script setup lang="ts">
import type Konva from 'konva';
import type { DriveAsset, KonvaComponent, SceneElementCanvasObjectAsset } from '~/models/types';
import { useCanvasElementAssetLabel } from '~/composables/useCanvasElementAssetLabel';

const props = defineProps<{
  element: SceneElementCanvasObjectAsset
}>();

const { file, label } = useDriveFile<DriveAsset>(
  toRef(() => props.element.asset.id),
  {
    strategy: DataRetrievalStrategies.LAZY,
    predicate: isDriveAsset,
  },
);

const elementLabel = useCanvasElementAssetLabel(
  toRef(() => props.element),
  file,
  label,
);

const paddingSize = 10;
const minWidth = 100;
const labelText = ref<KonvaComponent<Konva.Text> | null>(null);

const labelTextConfig = computed<Konva.TextConfig>(() => {
  return {
    x: 0,
    y: props.element.container.height * props.element.container.scaleY + paddingSize,
    text: elementLabel.value,
    fontSize: 16,
    fontFamily: 'Source Sans Pro, sans-serif',
    fill: 'black',
    align: 'center',
    verticalAlign: 'middle',
    listening: false,
    width: Math.max(
      props.element.container.width * props.element.container.scaleX,
      minWidth,
    ),
    padding: paddingSize,
    scaleX: 1,
    scaleY: 1,
  };
});

const labelWidth = computed(() => {
  return (labelText.value?.getNode().getTextWidth() ?? 0) + 2 * paddingSize;
});

const labelBackgroundConfig = computed<Konva.RectConfig>(() => {
  return {
    x: (labelTextConfig.value.width ?? 0) / 2,
    y: labelTextConfig.value.y,
    offsetX: labelWidth.value / 2,
    width: labelWidth.value,
    height: labelText.value?.getNode().height(),
    fill: 'white',
    listening: false,
    opacity: 0.5,
    scaleX: 1,
    scaleY: 1,
  };
});

const groupConfig = computed<Konva.GroupConfig>(() => {
  // scale back asset transforms to the original size
  return {
    scaleX: 1 / props.element.container.scaleX,
    scaleY: 1 / props.element.container.scaleY,
  };
});
</script>

<template>
  <v-group
    :config="groupConfig"
  >
    <v-rect :config="labelBackgroundConfig" />
    <v-text ref="labelText" :config="labelTextConfig" />
  </v-group>
</template>

<style scoped lang="scss">

</style>
