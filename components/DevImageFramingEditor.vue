<script setup lang="ts">
import type { Frame, MockImage } from '~/utils/image-framing/mock';
import { makeFrame, maxZoom, outputSize } from '~/utils/image-framing/mock';

const props = defineProps<{ original: MockImage; initialFrame?: Frame; ratio: number }>();
const emit = defineEmits<{ cancel: []; apply: [blob: Blob, frame: Frame] }>();
const dialog = ref<HTMLDialogElement>();
const canvas = ref<HTMLCanvasElement>();
const bitmap = shallowRef<ImageBitmap>();
const error = ref('');
const busy = ref(false);
const zoom = ref(1);
const centerX = ref(0.5);
const centerY = ref(0.5);
const restoredFrame = shallowRef<Frame>();
let alive = true;
let drag: { x: number; y: number; centerX: number; centerY: number } | undefined;
const zoomLimit = computed(() => bitmap.value ? maxZoom(bitmap.value.width, bitmap.value.height, props.ratio) : null);
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

onMounted(async () => {
  dialog.value?.showModal();
  try {
    if (props.original.blob.size > 20 * 1024 * 1024)
      throw new Error('Image exceeds the 20 MB lab limit.');
    const image = await createImageBitmap(props.original.blob, { imageOrientation: 'from-image' });
    if (!alive) {
      image.close();
      return;
    }
    if (image.width * image.height > 40_000_000) {
      image.close();
      throw new Error('Image exceeds the 40 megapixel lab limit.');
    }
    bitmap.value = image;
    if (zoomLimit.value === null)
      return;
    if (props.initialFrame) {
      // Let the range's new maximum reach the DOM before restoring its value;
      // otherwise the browser clamps that value against the initial max of 1.
      await nextTick();
      if (!alive)
        return;
      const f = props.initialFrame;
      const base = makeFrame(image.width, image.height, props.ratio, 1, 0.5, 0.5);
      zoom.value = Math.max(1, Math.min(zoomLimit.value, base.w / f.w));
      centerX.value = (f.x + f.w / 2) / 1e6;
      centerY.value = (f.y + f.h / 2) / 1e6;
      if (outputSize(image.width, image.height, f, props.ratio))
        restoredFrame.value = f;
    }
  } catch (e) { error.value = e instanceof Error ? e.message : 'Could not decode this image.'; }
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
    move(...directions[e.key]);
  }
}
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
  <dialog ref="dialog" class="editor" aria-labelledby="frame-title" @cancel.prevent="!busy && emit('cancel')">
    <h2 id="frame-title" class="editor-title">
      Edit image <span>· {{ ratio === 1 ? 'Square' : '2:1' }}</span>
    </h2>
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
      This image is too small for a {{ 512 }} × {{ 512 / ratio }} crop without upscaling. Choose a larger image.
    </p>
    <p v-if="size" class="output-info">
      Output · {{ size.width }} × {{ size.height }} PNG
    </p>
    <label class="zoom"><span>Zoom: {{ zoom.toFixed(2) }}×</span> <input v-model.number="zoom" type="range" min="1" :max="zoomLimit ?? 1" step="any" :disabled="!size || busy || zoomLimit === 1" @input="restoredFrame = undefined"></label>
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
      <VaButton preset="secondary" :disabled="busy" @click="emit('cancel')">
        Cancel edit
      </VaButton>
      <VaButton :disabled="!size || busy" @click="apply">
        {{ busy ? 'Applying…' : 'Apply crop' }}
      </VaButton>
    </div>
  </dialog>
</template>

<style scoped>
.editor {
  width: min(94vw, 42rem);
  max-height: 90vh;
  overflow: auto;
  border: 0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  background: var(--va-background-primary);
  color: var(--va-text-primary);
  box-shadow: 0 1rem 3rem #0005;
}
.editor::backdrop {
  background: #000a;
}
.editor p {
  margin: 0.75rem 0;
}
.editor-title {
  font-size: 1.25rem;
  font-weight: 700;
}
.editor-title span,
.hint {
  color: var(--va-secondary);
}
.hint {
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
}
.zoom input {
  flex: 1;
  accent-color: var(--va-primary);
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
