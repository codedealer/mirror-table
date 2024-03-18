<script setup lang="ts">
import type { WidgetMarkdown } from '~/models/types';

const props = defineProps<{
  widget: WidgetMarkdown
}>();
</script>

<template>
  <va-card outlined class="card-thin">
    <va-card-content>
      <MarkdownRenderer :source="widget.content" />
    </va-card-content>
  </va-card>
</template>

<style scoped lang="scss">

</style>
