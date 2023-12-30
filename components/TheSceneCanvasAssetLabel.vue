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

const { label: elementLabel, isVisible } = useCanvasElementAssetLabel(
  toRef(() => props.element),
  file,
  label,
);

const tableStore = useTableStore();

const isEditable = computed(() => tableStore.permissions.isOwner);

const paddingSize = 10;
const minWidth = 100;
const labelText = ref<KonvaComponent<Konva.Text> | null>(null);

const labelTextConfig = computed<Konva.TextConfig>(() => {
  const scaledWidth = props.element.container.width * props.element.container.scaleX;
  const offsetMode = scaledWidth <= minWidth;
  return {
    x: offsetMode ? scaledWidth / 2 : 0,
    y: props.element.container.height * props.element.container.scaleY + paddingSize,
    offsetX: offsetMode ? minWidth / 2 : 0,
    text: elementLabel.value,
    fontSize: 16,
    fontFamily: 'Source Sans Pro, sans-serif',
    fill: 'black',
    textDecoration: isVisible.value ? 'none' : 'line-through',
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

const labelWidth = ref(0);

const labelBackgroundConfig = computed<Konva.RectConfig>(() => {
  const scaledWidth = props.element.container.width * props.element.container.scaleX;
  const x = (labelTextConfig.value.width ?? 0) < scaledWidth
    ? (labelTextConfig.value.width ?? 0) / 2
    : scaledWidth / 2;
  return {
    x,
    y: labelTextConfig.value.y,
    offsetX: labelWidth.value / 2,
    width: labelWidth.value,
    height: labelText.value?.getNode().height(),
    fill: 'white',
    listening: true,
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

const canvasStageStore = useCanvasStageStore();

watch(labelTextConfig, async () => {
  await nextTick();
  labelWidth.value = (labelText.value?.getNode().getTextWidth() ?? 0) + 2 * paddingSize;
}, { immediate: true });

// because of the reverse scaling, we need to force update the transformer
watch(groupConfig, async () => {
  await nextTick();
  await nextTick();
  await nextTick();
  canvasStageStore.imageTransformer?.forceUpdate();
});
</script>

<template>
  <v-group
    v-if="elementLabel.length > 0"
    v-show="isVisible || isEditable"
    :config="groupConfig"
  >
    <v-rect :config="labelBackgroundConfig" />
    <v-text ref="labelText" :config="labelTextConfig" />
  </v-group>
</template>

<style scoped lang="scss">

</style>
