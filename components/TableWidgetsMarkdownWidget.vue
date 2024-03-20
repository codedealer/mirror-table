<script setup lang="ts">
import type { DynamicPanelModelType, WidgetMarkdown } from '~/models/types';

defineProps<{
  panel: DynamicPanelModelType
  widget: WidgetMarkdown
}>();
</script>

<template>
  <va-card outlined class="card-thin">
    <TableWidgetsControls :panel="panel" :widget="widget" />
    <va-card-block>
      <va-card-content>
        <MarkdownRenderer :source="widget.content" />
      </va-card-content>
    </va-card-block>
  </va-card>
</template>

<style scoped lang="scss">

</style>
