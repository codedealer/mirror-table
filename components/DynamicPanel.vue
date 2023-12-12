<script setup lang="ts">
import { useCssVar } from '@vueuse/core';
import { useDynamicPanelStore } from '~/stores/dynamic-panel-store';
import type { DynamicPanelModelType } from '~/models/types';
import { useRightPanelStore } from '~/stores/right-panel-store';

const props = defineProps<{
  name: DynamicPanelModelType
}>();

const store = useDynamicPanelStore();
const { models } = toRefs(store);

const classes = computed(() => {
  return {
    'dynamic-left': props.name === DynamicPanelModelTypes.LEFT,
    'dynamic-right': props.name === DynamicPanelModelTypes.RIGHT,
  };
});

const sidebar = ref(null);

const panelOffset = useCssVar(`--dynamic-panel-offset-${props.name}`, sidebar);

if (props.name === DynamicPanelModelTypes.RIGHT) {
  const rightPanelStore = useRightPanelStore();

  const { sideBarMinimized } = toRefs(rightPanelStore);

  watchEffect(() => {
    if (sideBarMinimized.value) {
      panelOffset.value = '0';
    } else {
      panelOffset.value = '256';
    }
  });
} else {
  const tableStore = useTableStore();

  watchEffect(() => {
    if (tableStore.permissions.isEditor) {
      panelOffset.value = '48'; // there is a toolbar
    } else {
      panelOffset.value = '0';
    }
  });
}
</script>

<template>
  <va-sidebar
    ref="sidebar"
    :minimized="!models[name]"
    minimized-width="0"
    :animated="name"
    :class="classes"
    class="dynamic-panel"
  >
    <VaSidebarItem>
      <VaSidebarItemContent>
        <VaIcon name="error" />
        <VaSidebarItemTitle>
          Hello WORLDDDDD
        </VaSidebarItemTitle>
      </VaSidebarItemContent>
    </VaSidebarItem>
  </va-sidebar>
</template>

<style scoped lang="scss">

</style>
