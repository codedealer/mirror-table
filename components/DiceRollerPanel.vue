<script setup lang="ts">
import { useDraggable } from '@vueuse/core';

const diceRollerVisible = useState('dice-roller-visible', () => false);
const panel = ref<HTMLElement | null>(null);
const handle = ref<HTMLElement | null>(null);
const { x, y, isDragging } = useDraggable(panel, {
  handle,
  preventDefault: true,
  initialValue: { x: 24, y: 24 },
});

const clampPanelPosition = () => {
  if (!import.meta.client || !panel.value) {
    return;
  }

  x.value = Math.max(0, Math.min(x.value, window.innerWidth - panel.value.offsetWidth));
  y.value = Math.max(0, Math.min(y.value, window.innerHeight - panel.value.offsetHeight));
};

const panelStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}));

const closeDiceRoller = () => {
  diceRollerVisible.value = false;
};

onMounted(() => {
  nextTick(clampPanelPosition);
  window.addEventListener('resize', clampPanelPosition);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', clampPanelPosition);
});
</script>

<template>
  <div
    v-show="diceRollerVisible"
    ref="panel"
    class="dice-roller-panel"
    :class="{ 'dice-roller-panel--dragging': isDragging }"
    :style="panelStyle"
    @pointerup="clampPanelPosition"
  >
    <DiceRoller>
      <template #leading>
        <span ref="handle" class="dice-roller-panel__drag-handle" aria-label="Drag dice roller" title="Drag dice roller">
          <VaIcon name="drag_indicator" aria-hidden="true" />
        </span>
      </template>
      <template #trailing>
        <VaButton preset="plain" color="tertiary" icon="cancel" size="small" aria-label="Close dice roller" @click="closeDiceRoller" />
      </template>
    </DiceRoller>
  </div>
</template>

<style scoped lang="scss">
.dice-roller-panel {
  position: fixed;
  z-index: var(--window-top-tier-z-index);
  width: auto;
  padding: 0.25rem;
  border: 1px solid var(--va-primary);
  border-radius: 4px;
  background: var(--va-background-element);
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 24%);
}

.dice-roller-panel--dragging {
  user-select: none;
}

.dice-roller-panel__drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  color: var(--va-tertiary);
  cursor: move;
  flex-shrink: 0;
}

.dice-roller-panel :deep(.dice-roller) {
  max-width: none;
}

.dice-roller-panel :deep(.dice-roller__row) {
  border-top: 0;
  box-shadow: none;
}
</style>
