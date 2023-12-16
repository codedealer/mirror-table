<script setup lang="ts">
import { useCssVar } from '@vueuse/core';
import { useDynamicPanelStore } from '~/stores/dynamic-panel-store';
import type { DynamicPanelContentType, DynamicPanelModelType } from '~/models/types';
import { useRightPanelStore } from '~/stores/right-panel-store';
import { DynamicPanelContentTypes } from '~/models/types';
import { SessionExplorer, TableExplorer } from '#components';

const props = defineProps<{
  name: DynamicPanelModelType
}>();

const store = useDynamicPanelStore();
const { models, contents } = toRefs(store);

const availableComponents: Record<DynamicPanelContentType, unknown> = {
  [DynamicPanelContentTypes.EXPLORER]: TableExplorer,
  [DynamicPanelContentTypes.SESSIONS]: SessionExplorer,
};

const content = computed(() => {
  const name = contents.value[props.name];

  if (!name) {
    return null;
  }

  return availableComponents[name];
});

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
    <div class="dynamic-panel__header">
      <va-button
        preset="plain"
        color="primary-dark"
        class="dynamic-panel__close"
        @click="store.close(name)"
      >
        <va-icon name="close" size="large" />
      </va-button>
    </div>
    <va-scroll-container vertical>
      <div class="dynamic-panel__content">
        <component :is="content" />
      </div>
    </va-scroll-container>
  </va-sidebar>
</template>

<style scoped lang="scss">

</style>
