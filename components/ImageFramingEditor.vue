<script setup lang="ts">
import type { Frame } from '~/utils/image-framing/geometry';
import { useId } from 'vue';
import { frameMatchesRatio, makeFrame, maxZoom, outputSize, targetSize } from '~/utils/image-framing/geometry';
import { isAnimated } from '~/utils/image-framing/media';

const props = defineProps<{ source: Blob; initialFrame?: Frame; ratio: number }>();
const emit = defineEmits<{ cancel: []; apply: [blob: Blob, frame: Frame] }>();
const titleId = `image-framing-title-${useId()}`;
const modalOpen = ref(true);
const canvas = ref<HTMLCanvasElement>();
const bitmap = shallowRef<ImageBitmap>();
const error = ref('');
const busy = ref(false);
const zoom = ref(1);
const centerX = ref(0.5);
const centerY = ref(0.5);
const restoredFrame = shallowRef<Frame>();
const zoomSlider = ref<{ $el?: HTMLElement }>();
let alive = true;
let drag: { x: number; y: number; centerX: number; centerY: number } | undefined;
const zoomLimit = computed(() => bitmap.value ? maxZoom(bitmap.value.width, bitmap.value.height, props.ratio) : null);
const zoomStep = computed(() => zoomLimit.value !== null && zoomLimit.value > 1 ? (zoomLimit.value - 1) / 512 : 0.01);
const frame = computed(() => bitmap.value && zoomLimit.value !== null && (restoredFrame.value ?? makeFrame(bitmap.value.width, bitmap.value.height, props.ratio, zoom.value, centerX.value, centerY.value)));
const size = computed(() => bitmap.value && frame.value && outputSize(bitmap.value.width, bitmap.value.height, frame.value, props.ratio));

function reset() {
  restoredFrame.value = undefined;
  zoom.value = 1;
  centerX.value = 0.5;
  centerY.value = 0.5;
}
function draw(target: HTMLCanvasElement) {
  const image = bitmap.value;
  const crop = frame.value;
  const dimensions = size.value;
  if (!image || !crop || !dimensions)
    return;
  target.width = dimensions.width;
  target.height = dimensions.height;
  const ctx = target.getContext('2d');
  if (!ctx)
    throw new Error('Canvas is unavailable in this browser.');
  ctx.drawImage(image, crop.x / 1e6 * image.width, crop.y / 1e6 * image.height, crop.w / 1e6 * image.width, crop.h / 1e6 * image.height, 0, 0, target.width, target.height);
}
watch([frame, canvas], () => {
  if (canvas.value && frame.value) {
    try {
      draw(canvas.value);
    } catch {
      error.value = 'Could not draw the preview.';
    }
  }
}, { flush: 'post' });

function focusDialog(dialog: HTMLElement) {
  const target = dialog.matches('[role="dialog"]')
    ? dialog
    : document.getElementById(titleId)?.closest<HTMLElement>('[role="dialog"]');
  if (!target)
    return;
  target.tabIndex = -1;
  let attempts = 0;
  const focus = () => {
    if (!target.isConnected || target.contains(document.activeElement))
      return;
    target.focus();
    if (attempts++ < 10 && !target.contains(document.activeElement))
      setTimeout(focus, 40);
  };
  setTimeout(focus, 0);
}
function updateModal(open: boolean) {
  if (open) {
    modalOpen.value = true;
    return;
  }
  if (busy.value)
    return;
  modalOpen.value = false;
  emit('cancel');
}
function requestClose() {
  if (busy.value)
    return;
  modalOpen.value = false;
  emit('cancel');
}

onMounted(async () => {
  await nextTick();
  const dialog = document.getElementById(titleId)?.closest<HTMLElement>('[role="dialog"]');
  if (dialog)
    focusDialog(dialog);
  try {
    if (props.source.size > 20 * 1024 * 1024)
      throw new Error('Image exceeds the 20 MB limit.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(props.source.type))
      throw new Error('Choose a static JPEG, PNG or WebP image.');
    if (await isAnimated(props.source))
      throw new Error('Animated images are not supported.');
    const image = await createImageBitmap(props.source, { imageOrientation: 'from-image' });
    if (!alive) {
      image.close();
      return;
    }
    if (image.width * image.height > 40_000_000) {
      image.close();
      throw new Error('Image exceeds the 40 megapixel limit.');
    }
    bitmap.value = image;
    if (zoomLimit.value === null)
      return;
    if (props.initialFrame) {
      // Let the slider's new maximum reach the DOM before restoring its value;
      // otherwise it clamps that value against the initial max of 1.
      await nextTick();
      if (!alive)
        return;
      const f = props.initialFrame;
      if (!frameMatchesRatio(f, image.width, image.height, props.ratio) || !outputSize(image.width, image.height, f, props.ratio))
        throw new Error('The saved frame is invalid or too small for this output.');
      const base = makeFrame(image.width, image.height, props.ratio, 1, 0.5, 0.5);
      zoom.value = Math.max(1, Math.min(zoomLimit.value, base.w / f.w));
      centerX.value = (f.x + f.w / 2) / 1e6;
      centerY.value = (f.y + f.h / 2) / 1e6;
      restoredFrame.value = f;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not decode this image.';
    bitmap.value?.close();
    bitmap.value = undefined;
  }
});
onBeforeUnmount(() => {
  alive = false;
  bitmap.value?.close();
});

function move(dx: number, dy: number) {
  if (!frame.value)
    return;
  const crop = frame.value;
  restoredFrame.value = undefined;
  centerX.value += dx * crop.w / 1e6;
  centerY.value += dy * crop.h / 1e6;
  centerX.value = Math.max(crop.w / 2e6, Math.min(1 - crop.w / 2e6, centerX.value));
  centerY.value = Math.max(crop.h / 2e6, Math.min(1 - crop.h / 2e6, centerY.value));
}
function startDrag(e: PointerEvent) {
  if (busy.value)
    return;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, centerX: centerX.value, centerY: centerY.value };
}
function dragMove(e: PointerEvent) {
  if (!drag || !frame.value)
    return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  centerX.value = drag.centerX;
  centerY.value = drag.centerY;
  move(-(e.clientX - drag.x) / rect.width, -(e.clientY - drag.y) / rect.height);
}
function endDrag(e: PointerEvent) {
  if (!drag)
    return;
  // A tap/click recentres the crop without requiring a dragging gesture.
  if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    move((e.clientX - rect.left) / rect.width - 0.5, (e.clientY - rect.top) / rect.height - 0.5);
  }
  drag = undefined;
}
function keyMove(e: KeyboardEvent) {
  const directions: Record<string, [number, number]> = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, -0.05], ArrowDown: [0, 0.05] };
  if (!busy.value && directions[e.key]) {
    e.preventDefault();
    e.stopPropagation();
    move(...directions[e.key]);
  }
}
function sliderRoot() {
  const slider = zoomSlider.value;
  return slider instanceof HTMLElement ? slider : (slider as { $el?: HTMLElement } | undefined)?.$el;
}
function focusSliderRoot(event: FocusEvent) {
  const root = sliderRoot();
  if (root && event.target !== root)
    root.focus();
}
function adjustZoomByKey(event: KeyboardEvent) {
  if (!size.value || busy.value || zoomLimit.value === null)
    return;
  let nextZoom: number | undefined;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      nextZoom = Math.min(zoomLimit.value, zoom.value + 0.01);
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      nextZoom = Math.max(1, zoom.value - 0.01);
      break;
    case 'PageUp':
      nextZoom = Math.min(zoomLimit.value, zoom.value + 0.1);
      break;
    case 'PageDown':
      nextZoom = Math.max(1, zoom.value - 0.1);
      break;
    case 'Home':
      nextZoom = 1;
      break;
    case 'End':
      nextZoom = zoomLimit.value;
      break;
  }
  if (nextZoom !== undefined) {
    event.preventDefault();
    zoom.value = nextZoom;
    restoredFrame.value = undefined;
  }
}
function stopSliderKeyLeak(event: KeyboardEvent) {
  if (!sliderRoot()?.contains(event.target as Node) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))
    event.stopPropagation();
}
function disableSliderHandlerTabStops(element: HTMLElement) {
  for (const handler of element.querySelectorAll<HTMLElement>('.va-slider__handler')) {
    handler.tabIndex = -1;
    handler.setAttribute('aria-hidden', 'true');
  }
}
const vSliderFocusTarget = {
  mounted(element: HTMLElement) {
    disableSliderHandlerTabStops(element);
    element.addEventListener('keydown', adjustZoomByKey);
  },
  updated: disableSliderHandlerTabStops,
  beforeUnmount(element: HTMLElement) {
    element.removeEventListener('keydown', adjustZoomByKey);
  },
};
async function apply() {
  if (busy.value || !frame.value || !size.value)
    return;
  busy.value = true;
  error.value = '';
  try {
    const appliedFrame = { ...frame.value };
    const output = document.createElement('canvas');
    draw(output);
    const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob || blob.type !== 'image/png')
      throw new Error('PNG encoding failed. Please retry.');
    if (alive)
      emit('apply', blob, appliedFrame);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not export. Please retry.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <VaModal
    :model-value="modalOpen"
    class="editor-modal"
    :title="titleId"
    size="large"
    max-width="min(94vw, 42rem)"
    max-height="90vh"
    hide-default-actions
    :close-button="!busy"
    :no-dismiss="busy"
    :no-esc-dismiss="busy"
    @before-open="focusDialog"
    @open="focusDialog"
    @update:model-value="updateModal"
  >
    <template #header>
      <h2 :id="titleId" class="editor-title">
        Edit image · {{ ratio === 1 ? 'Square' : `${ratio}:1` }}
      </h2>
    </template>
    <div class="editor" @keydown="stopSliderKeyLeak">
      <p class="hint">
        Drag to position, click or tap to centre a point, or focus the preview and use arrow keys. The preview matches the exported crop.
      </p>
      <div v-if="bitmap && size" class="preview-wrap">
        <canvas ref="canvas" class="preview" tabindex="0" aria-label="Crop preview; use arrow keys to pan or click to centre a point" @pointerdown="startDrag" @pointermove="dragMove" @pointerup="endDrag" @pointercancel="drag = undefined" @keydown="keyMove" />
      </div>
      <p v-else-if="!bitmap && !error">
        Loading Original…
      </p>
      <p v-if="bitmap && !size" role="alert" class="error">
        This image is too small for a {{ targetSize(ratio).width }} × {{ targetSize(ratio).height }} crop without upscaling. Choose a larger image.
      </p>
      <p v-if="size" class="output-info">
        Output · {{ size.width }} × {{ size.height }} PNG
      </p>
      <div class="zoom">
        <span>Zoom: {{ zoom.toFixed(2) }}×</span>
        <VaSlider
          v-model="zoom"
          v-slider-focus-target
          class="zoom-slider"
          aria-label="Zoom crop preview"
          :min="1"
          :max="zoomLimit ?? 1"
          :step="zoomStep"
          :tabindex="size && !busy && zoomLimit !== 1 ? 0 : -1"
          :disabled="!size || busy || zoomLimit === 1"
          @focusin="focusSliderRoot"
          @update:model-value="restoredFrame = undefined"
        />
      </div>
      <p v-if="size" class="hint">
        Zoom is limited by the source resolution.
      </p>
      <p v-if="error" role="alert">
        {{ error }}
      </p>
      <div class="controls editor-actions">
        <VaButton preset="secondary" :disabled="!size || busy" @click="reset">
          Reset
        </VaButton>
        <span class="spacer" />
        <VaButton preset="secondary" :disabled="busy" @click="requestClose">
          Cancel edit
        </VaButton>
        <VaButton :disabled="!size || busy" :loading="busy" @click="apply">
          {{ busy ? 'Applying…' : 'Apply crop' }}
        </VaButton>
      </div>
    </div>
  </VaModal>
</template>

<style scoped>
.editor {
  max-height: 78vh;
  overflow: auto;
}
.editor p {
  margin: 0.75rem 0;
}
.editor-title {
  margin: 0;
  color: var(--va-text-primary);
  font-size: 1.25rem;
  font-weight: 700;
}
.hint {
  color: var(--va-secondary);
  font-size: 0.875rem;
  line-height: 1.45;
}
.output-info {
  font-weight: 600;
}
.error {
  color: var(--va-danger);
}
.preview-wrap {
  display: flex;
  justify-content: center;
  background: var(--va-background-element);
  border-radius: 0.5rem;
  padding: 0.75rem;
}
.preview {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 45vh;
  object-fit: contain;
  touch-action: none;
  cursor: grab;
  background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 20px 20px;
}
.zoom {
  display: grid;
  grid-template-columns: auto minmax(8rem, 1fr);
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}
.zoom-slider {
  min-width: 0;
}
.zoom-slider:focus-visible {
  outline: 2px solid var(--va-primary);
  outline-offset: 3px;
  border-radius: 0.25rem;
}
.preview:focus-visible {
  outline: 3px solid var(--va-primary);
  outline-offset: 3px;
}
.spacer {
  flex: 1;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
}
.editor-actions {
  margin-top: 1.25rem;
}
</style>
