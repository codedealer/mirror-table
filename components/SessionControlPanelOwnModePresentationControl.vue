<script setup lang="ts">
import { TableModes } from '~/models/types';

const tableStore = useTableStore();
const sessionStore = useSessionStore();

const isPresentationMode = computed(() => tableStore.mode === TableModes.PRESENTATION);

const exit = () => {
  sessionStore.exitPresentationMode();
};
</script>

<template>
  <va-card-block v-show="isPresentationMode" horizontal>
    <va-divider vertical />
    <va-card-content class="flex gap-05">
      <va-popover :hover-over-timeout="1000" message="Exit presentation mode">
        <va-button
          preset="primary"
          icon="arrow_back"
          @click="exit"
        />
      </va-popover>
    </va-card-content>
  </va-card-block>
</template>

<style scoped lang="scss">

</style>
