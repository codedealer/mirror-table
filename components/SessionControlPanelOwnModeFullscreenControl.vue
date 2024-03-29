<script setup lang="ts">
import { useFullscreen } from '@vueuse/core';

const { isFullscreen, toggle, isSupported } = useFullscreen();
</script>

<template>
  <va-card-block v-show="isSupported" horizontal>
    <va-divider vertical />
    <va-card-content class="flex gap-05">
      <va-popover :hover-over-timeout="1000" message="Toggle Fullscreen mode">
        <va-button
          preset="primary"
          :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          @click="toggle"
        />
      </va-popover>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
