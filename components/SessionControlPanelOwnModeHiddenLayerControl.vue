<script setup lang="ts">
const layersStore = useLayersStore();
const hoverPanelStore = useHoverPanelStore();

watchEffect(() => {
  if (layersStore.hideHiddenElements) {
    hoverPanelStore.requestManual('hidden-elements');
  } else {
    hoverPanelStore.dismissManual('hidden-elements');
  }
});

onUnmounted(() => {
  hoverPanelStore.dismissManual('hidden-elements');
});
</script>

<template>
  <va-card-block
    horizontal
  >
    <va-card-content class="flex gap-05">
      <va-popover
        message="Toggle hidden elements (H)"
      >
        <va-button
          preset="primary"
          :color="layersStore.hideHiddenElements ? 'primary' : 'primary-dark'"
          :class="layersStore.hideHiddenElements ? 'a-pulse' : ''"
          icon="disabled_visible"
          title="Toggle hidden elements"
          @click="layersStore.toggleHiddenElements"
        />
      </va-popover>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
