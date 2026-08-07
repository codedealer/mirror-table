<script setup lang="ts">
import type Konva from 'konva';
import type { TableSessionPresence } from '~/models/types';
import { DynamicPanelModelTypes } from '~/models/types';

const props = defineProps<{
  sessionPresence: TableSessionPresence;
}>();
const strokeWidth = 2;
const dynamicPanelWidth = 256;
const panelOpacity = 0.35;
const tableStore = useTableStore();

const showScreenFrame = computed(() => {
  if (
    !props.sessionPresence.screen
    || !props.sessionPresence.screen.enabled
    || props.sessionPresence.screen.width <= 0
    || props.sessionPresence.screen.height <= 0
  ) {
    return false;
  }

  return true;
});

const containerConfig = computed<Konva.ContainerConfig>(() => {
  return {
    name: 'screen-frame-container',
    visible: showScreenFrame.value,
    listening: false,
    x: (props.sessionPresence.screen?.x ?? 0) + strokeWidth,
    y: (props.sessionPresence.screen?.y ?? 0) + strokeWidth,
    width: Math.max(0, (props.sessionPresence.screen?.width ?? 0) - strokeWidth * 2),
    height: Math.max(0, (props.sessionPresence.screen?.height ?? 0) - strokeWidth * 2),
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  };
});

const frameConfig = computed<Konva.RectConfig>(() => {
  return {
    x: 0,
    y: 0,
    width: containerConfig.value.width,
    height: containerConfig.value.height,
    stroke: props.sessionPresence.color || 'red',
    strokeWidth: 2,
  };
});

const panelFrameConfigs = computed<Konva.RectConfig[]>(() => {
  const frameWidth = containerConfig.value.width ?? 0;
  const frameHeight = containerConfig.value.height ?? 0;
  const width = Math.min(dynamicPanelWidth, frameWidth);
  const color = props.sessionPresence.color || 'red';
  const configs: Konva.RectConfig[] = [];

  if (tableStore.table?.panels[DynamicPanelModelTypes.LEFT]) {
    configs.push({
      x: 0,
      y: 0,
      width,
      height: frameHeight,
      fill: color,
      opacity: panelOpacity,
    });
  }

  if (tableStore.table?.panels[DynamicPanelModelTypes.RIGHT]) {
    configs.push({
      x: frameWidth - width,
      y: 0,
      width,
      height: frameHeight,
      fill: color,
      opacity: panelOpacity,
    });
  }

  return configs;
});

const labelConfig = computed<Konva.TextConfig>(() => {
  return {
    x: 5,
    y: 5,
    text: props.sessionPresence.displayName,
    fontSize: 12,
    fill: props.sessionPresence.color || 'red',
    padding: 4,
  };
});
</script>

<template>
  <v-group
    :config="containerConfig"
  >
    <v-rect :config="frameConfig" />
    <v-rect
      v-for="(config, index) in panelFrameConfigs"
      :key="index"
      :config="config"
    />
    <v-text :config="labelConfig" />
  </v-group>
</template>

<style scoped lang="scss">

</style>
