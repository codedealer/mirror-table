<script setup lang="ts">
import MarkdownIt from 'markdown-it';

defineProps<{
  source: string
}>();

const md = new MarkdownIt();
</script>

<template>
  <div class="window-container-markdown-renderer">
    <div v-html="md.render(source)" />
  </div>
</template>

<style scoped lang="scss">

</style>
