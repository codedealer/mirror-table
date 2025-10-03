<script setup lang="ts">
import type { DynamicPanelModelType } from '~/models/types';

const props = defineProps<{
  id: string;
  panel: DynamicPanelModelType;
}>();
const tableStore = useTableStore();

const remove = () => {
  tableStore.removeWidgetFromPanel(props.panel, props.id);
};
</script>

<template>
  <div class="ghost-container">
    <va-card
      v-if="tableStore.mode === TableModes.OWN"
      stripe
      stripe-color="danger"
      outlined
      class="card-thin flex"
    >
      <va-card-block horizontal>
        <va-card-content class="centered">
          <small>
            This widget is not available or was removed.
          </small>
        </va-card-content>
      </va-card-block>
      <va-divider vertical />
      <va-card-block>
        <va-card-content class="centered">
          <va-button
            preset="plain"
            icon="close"
            color="#fff"
            @click="remove"
          />
        </va-card-content>
      </va-card-block>
    </va-card>
  </div>
</template>

<style scoped lang="scss">

</style>
