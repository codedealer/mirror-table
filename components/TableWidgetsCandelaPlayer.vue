<script setup lang="ts">
import type { DynamicPanelModelType, WidgetCandelaPlayer } from '~/models/types';

const props = defineProps<{
  panel: DynamicPanelModelType
  widget: WidgetCandelaPlayer
}>();

const {
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(toRef(() => props.widget.player?.avatar), {
  strategy: DataRetrievalStrategies.LAZY,
});

const tableStore = useTableStore();

const showPrivateContent = computed(() => {
  return tableStore.mode === TableModes.OWN && props.widget.privateContent;
});
</script>

<template>
  <va-card outlined class="card-thin">
    <TableWidgetsControls :panel="panel" :widget="widget" />
    <va-card-block>
      <va-card-content style="padding-bottom: 0">
        <div class="widget-candela-player-title">
          <p class="widget-candela-player-name">
            {{ widget.player.name }}
          </p>
          <p class="widget-candela-player-role">
            <span
              v-show="widget.player.role"
              class="widget-candela-player-role__role"
            >
              {{ widget.player.speciality ? `${widget.player.role}:` : widget.player.role }}
            </span>
            <span
              class="widget-candela-player-role__speciality"
            >
              {{ widget.player.speciality }}
            </span>
          </p>
        </div>
      </va-card-content>
    </va-card-block>
    <va-card-block>
      <va-card-content :class="widget?.player?.avatar ? 'grid-img-text' : ''">
        <div v-if="widget?.player?.avatar" class="widget-avatar">
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
          <div class="widget-candela-player-stats mb-05">
            <div class="widget-candela-player-stat">
              <va-icon name="man" />
              {{ widget.player.marks.body }}
            </div>
            <div class="widget-candela-player-stat">
              <va-icon name="psychology" />
              {{ widget.player.marks.mind }}
            </div>
            <div class="widget-candela-player-stat">
              <va-icon name="wifi_tethering" />
              {{ widget.player.marks.bleed }}
            </div>
            <div class="widget-candela-player-stat">
              <va-icon name="healing" color="danger-dark" />
              {{ widget.player.scars }}
            </div>
          </div>
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
