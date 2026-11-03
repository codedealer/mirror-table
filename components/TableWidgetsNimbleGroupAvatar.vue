<script setup lang="ts">
import type { PreviewProperties, WidgetNimbleGroupActorNpc } from '~/models/types';
import { nimbleNpcSubtypeIcon } from '~/models/NimbleGroup';

const props = defineProps<{
  preview: PreviewProperties | null;
  title: string;
  subtype?: WidgetNimbleGroupActorNpc['npc']['subtype'];
  fallbackIcon: string;
  src?: string;
}>();

const hasImage = computed(() => !!props.preview || !!props.src);
const subtypeIcon = computed(() => props.subtype ? nimbleNpcSubtypeIcon(props.subtype) : undefined);
const { file, error, isLoading } = usePreviewImage(toRef(() => props.preview), {
  strategy: DataRetrievalStrategies.LAZY,
});
</script>

<template>
  <span class="nimble-avatar">
    <DriveThumbnail
      v-if="hasImage"
      :file="file"
      :error="error"
      :file-is-loading="isLoading"
      :src="src"
      width="64"
      height="64"
      fit="cover"
      :title="title"
    />
    <va-icon
      v-if="!hasImage"
      :name="fallbackIcon"
      :size="32"
      :aria-label="`No avatar for ${title}`"
      class="nimble-avatar__fallback"
    />
    <span
      v-if="subtypeIcon"
      class="nimble-avatar__subtype"
      role="img"
      :aria-label="`${subtype} NPC`"
    >
      <va-icon :name="subtypeIcon" :size="16" aria-hidden="true" />
    </span>
  </span>
</template>

<style scoped lang="scss">
.nimble-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  height: 64px;
  position: relative;
  width: 64px;
}

.nimble-avatar__fallback {
  margin: auto;
}

.nimble-avatar__subtype {
  align-items: center;
  background: var(--va-primary-dark);
  border: 2px solid var(--va-primary-dark);
  border-radius: 50%;
  box-sizing: border-box;
  color: #fff;
  display: inline-flex;
  height: 24px;
  justify-content: center;
  left: 0;
  line-height: 1;
  position: absolute;
  top: 0;
  transform: translate(-50%, -50%);
  width: 24px;
  z-index: 2;
}
</style>
