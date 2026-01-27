<script setup lang="ts">
import type { ContextAction } from '~/models/types';
import { onClickOutside, useElementSize } from '@vueuse/core';

const store = useCanvasRightClickStore();
const canvasStageStore = useCanvasStageStore();

const menuRef = ref<HTMLDivElement | null>(null);
const { width: menuWidth, height: menuHeight } = useElementSize(menuRef);

// Close menu when clicking outside
onClickOutside(menuRef, () => {
  if (store.visible) {
    store.hide();
  }
});

// Calculate position to keep menu within viewport
const styleObject = computed(() => {
  if (!store.visible) {
    return { display: 'none' };
  }

  const canvasContainer = canvasStageStore.stage?.container()?.parentElement?.parentElement;
  const containerRect = canvasContainer?.getBoundingClientRect();

  if (!containerRect) {
    // Fallback to viewport bounds if container not available
    return {
      '--menu-left': `${Math.min(store.position.x, window.innerWidth - 200)}px`,
      '--menu-top': `${Math.min(store.position.y, window.innerHeight - 200)}px`,
    };
  }

  let x = store.position.x;
  let y = store.position.y;

  // Adjust if menu would overflow right edge
  if (x + menuWidth.value > containerRect.right) {
    x = containerRect.right - menuWidth.value - 8;
  }

  // Adjust if menu would overflow bottom edge
  if (y + menuHeight.value > containerRect.bottom) {
    y = containerRect.bottom - menuHeight.value - 8;
  }

  // Keep within left edge
  if (x < containerRect.left) {
    x = containerRect.left + 8;
  }

  // Keep within top edge
  if (y < containerRect.top) {
    y = containerRect.top + 8;
  }

  return {
    '--menu-left': `${x}px`,
    '--menu-top': `${y}px`,
  };
});

const executeAction = (action: ContextAction, event?: Event) => {
  event?.preventDefault();
  action.action();
  store.hide();
};

// Hide on escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && store.visible) {
    store.hide();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-show="store.visible"
      ref="menuRef"
      :style="styleObject"
      class="canvas-right-click-menu"
    >
      <va-card class="canvas-right-click-menu__card">
        <va-list class="canvas-right-click-menu__list drive-node__context-menu">
          <va-list-item
            v-for="action in store.actions"
            :key="action.id"
            :disabled="action.disabled"
            href="#"
            class="canvas-right-click-menu__item"
            @click="executeAction(action, $event)"
          >
            <va-list-item-section icon>
              <va-icon
                v-if="action.icon"
                :name="action.icon.name"
                :color="action.icon.color ?? 'primary-dark'"
                size="small"
              />
            </va-list-item-section>
            <va-list-item-section>
              <va-list-item-label>
                {{ action.label }}
              </va-list-item-label>
            </va-list-item-section>
          </va-list-item>
        </va-list>
      </va-card>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.canvas-right-click-menu {
  position: fixed;
  left: var(--menu-left);
  top: var(--menu-top);
  z-index: 1000;
  min-width: 180px;
  max-width: 280px;

  &__card {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: var(--va-background-secondary);
    color: rgb(var(--va-text-primary));
    padding: var(--va-dropdown-content-padding, 0);
  }

  &__item {
    --va-list-item-label-color: var(--va-list-item-label-caption-color);
    font-size: var(--va-list-item-label-caption-font-size);

    &:hover:not([disabled]) {
      background-color: var(--va-background-element);
    }

    &[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
