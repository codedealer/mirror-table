<script setup lang="ts">
import type { DynamicPanelModelType, WidgetMarkdown } from '~/models/types';

const props = defineProps<{
  panel: DynamicPanelModelType;
  widget: WidgetMarkdown;
}>();

const {
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(toRef(() => props.widget?.avatar), {
  strategy: DataRetrievalStrategies.LAZY,
});

const tableStore = useTableStore();
const showPrivateContent = computed(() => {
  return tableStore.mode === TableModes.OWN && props.widget.privateContent;
});
</script>

<template>
  <va-card outlined :bordered="false" class="card-thin">
    <TableWidgetsControls :panel="panel" :widget="widget" />
    <va-card-block>
      <va-card-content :class="widget?.avatar ? 'grid-img-text' : ''">
        <div v-if="widget?.avatar" class="widget-avatar">
          <DriveThumbnail
            :file="imageFile"
            :error="imageError"
            :file-is-loading="imageLoading"
            width="120"
            height="120"
            fit="cover"
          />
        </div>
        <div class="widget-content">
          <MarkdownRenderer :source="widget.content" />
        </div>
      </va-card-content>
    </va-card-block>
    <va-card-block
      v-if="showPrivateContent"
      class="widget-private-content"
    >
      <va-card-content>
        <MarkdownRenderer :source="widget.privateContent" />
      </va-card-content>
    </va-card-block>
  </va-card>
</template>

<style scoped lang="scss">

</style>
