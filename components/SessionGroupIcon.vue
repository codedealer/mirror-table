<script setup lang="ts">
import { useCssVar } from '@vueuse/core';
import type { SessionGroup } from '~/models/types';

const props = defineProps<{
  group: SessionGroup
}>();

const color = useCssVar('--icon-color');

watchEffect(() => {
  if (!props.group.groupId) {
    return;
  }

  color.value = props.group.color;
});
</script>

<template>
  <div class="session-group-icon">
    <va-popover
      :message="group.groupLabel ?? group.groupId!"
      placement="bottom"
      stick-to-edges
    >
      <i
        :style="{ '--icon-color': color }"
        class="session-group-icon__icon"
      />
    </va-popover>
  </div>
</template>

<style scoped lang="scss">
.session-group-icon {
  display: inline-grid;
  place-items: center;
}
.session-group-icon__icon {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--icon-color, red);
  box-sizing: border-box;
  margin: 5px;
}
</style>
