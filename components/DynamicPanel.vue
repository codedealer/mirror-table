<script setup lang="ts">
import type { DynamicPanelContentType, DynamicPanelModelType } from '~/models/types';
import { CanvasLayers, SessionExplorer, TableExplorer, TableWidgets } from '#components';
import { onClickOutside, useCssVar } from '@vueuse/core';
import { DynamicPanelContentTypes, TableModes } from '~/models/types';
import { useDynamicPanelStore } from '~/stores/dynamic-panel-store';
import { useRightPanelStore } from '~/stores/right-panel-store';

const props = defineProps<{
  name: DynamicPanelModelType;
}>();

const store = useDynamicPanelStore();
const tableStore = useTableStore();
const { models, contents } = storeToRefs(store);

// Pin button is only available to table owner in OWN mode
const canPin = computed(() => {
  return tableStore.permissions.isOwner && tableStore.mode === TableModes.OWN;
});

const currentContent = computed(() => contents.value[props.name]);
const isPinned = computed(() => store.isPinned(currentContent.value));

const togglePin = () => {
  store.togglePin(currentContent.value);
};

const availableComponents: Record<DynamicPanelContentType, unknown> = {
  [DynamicPanelContentTypes.EXPLORER]: TableExplorer,
  [DynamicPanelContentTypes.SESSIONS]: SessionExplorer,
  [DynamicPanelContentTypes.LAYERS]: CanvasLayers,
  [DynamicPanelContentTypes.WIDGETS]: TableWidgets,
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

const layoutStore = useLayoutStore();

if (props.name === DynamicPanelModelTypes.RIGHT) {
  const rightPanelStore = useRightPanelStore();

  const { sideBarMinimized } = storeToRefs(rightPanelStore);

  watchEffect(() => {
    if (layoutStore.toolbarEnabled) {
      panelOffset.value = sideBarMinimized.value ? '0' : '256';
    } else {
      panelOffset.value = '0';
    }
  });
} else {
  watchEffect(() => {
    panelOffset.value = layoutStore.toolbarEnabled ? '48' : '0';
  });
}

// Click outside handling for auto-close when unpinned
// Ignore clicks on Vuestic teleported overlay content (dropdowns, modals, etc.)
onClickOutside(sidebar, () => {
  if (!isPinned.value && models.value[props.name]) {
    store.close(props.name);
  }
}, {
  ignore: [
    '.va-dropdown__content',
    '.va-modal',
  ],
});
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
        v-if="canPin"
        preset="plain"
        :color="isPinned ? 'primary' : 'secondary'"
        class="dynamic-panel__pin"
        :title="isPinned ? 'Unpin panel (auto-close on click outside)' : 'Pin panel (stay open)'"
        @click="togglePin"
      >
        <va-icon :name="isPinned ? 'push_pin' : 'push_pin'" :class="{ 'pin-inactive': !isPinned }" size="medium" />
      </va-button>
      <div v-else class="dynamic-panel__spacer" />
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
        <component :is="content" :type="name" />
      </div>
    </va-scroll-container>
  </va-sidebar>
</template>

<style scoped lang="scss">
.dynamic-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
}

.dynamic-panel__spacer {
  flex: 1;
}

.dynamic-panel__pin {
  .pin-inactive {
    transform: rotate(45deg);
    opacity: 0.6;
  }
}
</style>
