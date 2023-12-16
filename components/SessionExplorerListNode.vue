<script setup lang="ts">
import type { TableSessionPresence } from '~/models/types';

defineProps<{
  presence: TableSessionPresence
}>();
</script>

<template>
  <div class="drive-node">
    <va-button
      color="text-primary"
      hover-behavior="opacity"
      class="drive-node__label"
      :hover-opacity="1"
      preset="plain"
    >
      <div
        class="drive-node__name flex"
      >
        <SessionGroupIcon
          :group="presence"
        />
        {{ presence.displayName ?? presence.sessionId }}
      </div>
    </va-button>
  </div>
</template>

<style scoped lang="scss">

</style>
