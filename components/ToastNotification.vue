<script setup lang="ts">
import { useTimeoutPoll } from '@vueuse/core';

interface ToastNotificationProps {
  title?: string;
  message: string;
  icon?: string;
  duration?: number;
  color?: string;
}

interface ToastNotificationEmits {
  (event: 'close'): void;
}

const props = withDefaults(defineProps<ToastNotificationProps>(), {
  title: '',
  icon: 'info_outline',
  duration: 5000,
  color: 'var(--va-background-secondary)',
});

const emits = defineEmits<ToastNotificationEmits>();

let resumeHook = () => {};
let pauseHook = () => {};

const close = () => {
  pauseHook();
  emits('close');
};

const { title, message, icon, duration, color } = toRefs(props);

let lifetime: number = duration.value;
const loop = 500; // ms
const decreaseLifetime = () => {
  lifetime -= loop;
  if (lifetime <= 0) {
    close();
  }
};

const onMouseHover = () => {
  pauseHook();
};

const onMouseLeave = () => {
  lifetime > 0 && resumeHook();
};

onMounted(() => {
  const { pause, resume } = useTimeoutPoll(decreaseLifetime, loop, {
    immediate: true,
  });
  pauseHook = pause;
  resumeHook = resume;
});
</script>

<template>
  <transition appear name="slide-fade">
    <div
      class="toast-notification"
      :style="`background-color: ${color}`"
      @mouseover="onMouseHover"
      @mouseleave="onMouseLeave"
    >
      <div v-show="icon" class="toast-notification__icon">
        <va-icon class="material-icons">
          {{ icon }}
        </va-icon>
      </div>
      <div class="toast-notification__content">
        <div v-if="title" class="toast-notification__title">
          {{ title }}
        </div>
        <div class="toast-notification__message">
          <slot name="content" :message="message">
            {{ message }}
          </slot>
        </div>
      </div>
      <div class="toast-notification__close">
        <va-button
          icon="close"
          preset="plain"
          color="primary-dark"
          size="large"
          @click="close"
        />
      </div>
    </div>
  </transition>
</template>

<style lang="scss">
.toast-notification {
  display: flex;
  max-width: 400px;
  gap: 1rem;
  padding: 1rem;
  margin: 1rem 2rem;
  align-items: center;
  border-radius: 12px;
  box-shadow: 2px 2px 12px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--va-background-border);
  &:first-child {
    margin-top: 2rem;
  }
}
</style>
