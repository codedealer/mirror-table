<script setup lang="ts">
import MarkdownIt from 'markdown-it';
import MarkdownItAbbr from 'markdown-it-abbr';
import MarkdownItFootnote from 'markdown-it-footnote';
import MarkdownItSub from 'markdown-it-sub';
import MarkdownItSup from 'markdown-it-sup';
import MarkdownItAnchor from 'markdown-it-anchor';
import MarkdownItTaskLists from 'markdown-it-task-lists';

defineProps<{
  source: string
}>();

const md = new MarkdownIt({ breaks: true })
  .use(MarkdownItAbbr)
  .use(MarkdownItFootnote)
  .use(MarkdownItSub)
  .use(MarkdownItSup)
  .use(MarkdownItAnchor)
  .use(MarkdownItTaskLists, { enabled: true });
</script>

<template>
  <div class="window-container-markdown-renderer">
    <div v-html="md.render(source)" />
  </div>
</template>

<style scoped lang="scss">

</style>
