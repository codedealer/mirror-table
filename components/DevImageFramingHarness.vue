<script setup lang="ts">
import type { Frame, MockImage, MockImageRepository } from '~/utils/image-framing/mock';
import { isAnimated } from '~/utils/image-framing/mock';

const props = defineProps<{ repository: MockImageRepository; fixtures: string[]; committedId: string }>();
const emit = defineEmits<{ save: [id: string]; remount: [] }>();
// Unmarked Originals have no stored shape; use the same square default on
// selection, cancellation and a fresh mount.
const imageRatio = (id: string) => props.repository.get(id)?.ratio ?? 1;
const stagedId = ref(props.committedId);
const ratio = ref(imageRatio(props.committedId));
const editing = ref(false);
const original = shallowRef<MockImage>();
const initialFrame = shallowRef<Frame>();
const error = ref('');
const notice = ref('');
const imageUrl = ref('');
const selectionPending = ref(false);
const selected = computed(() => props.repository.get(stagedId.value));
const draftIds = new Set<string>();
let selectionEpoch = 0;

watch(selected, (image) => {
  if (imageUrl.value)
    URL.revokeObjectURL(imageUrl.value);
  imageUrl.value = image ? URL.createObjectURL(image.blob) : '';
}, { immediate: true });
onBeforeUnmount(() => {
  selectionEpoch++;
  if (imageUrl.value)
    URL.revokeObjectURL(imageUrl.value);
});

function cleanupDrafts(except?: string) {
  for (const id of draftIds) {
    if (id !== except) {
      props.repository.remove(id);
      draftIds.delete(id);
    }
  }
}
function select(id: string) {
  selectionEpoch++;
  selectionPending.value = false;
  editing.value = false;
  stagedId.value = id;
  ratio.value = imageRatio(id);
  cleanupDrafts(id);
  error.value = '';
  notice.value = 'Selection staged. Save to commit it.';
}
async function fileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file)
    return;
  const epoch = ++selectionEpoch;
  selectionPending.value = true;
  error.value = '';
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024)
      throw new Error('Choose a JPEG, PNG or WebP under 20 MB. Animated images are not supported by this lab.');
    if (await isAnimated(file))
      throw new Error('Animated images are not supported.');
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (pixels > 40_000_000)
      throw new Error('Image exceeds the 40 megapixel lab limit.');
    if (epoch === selectionEpoch)
      select(props.repository.add(file.name, file).id);
  } catch (e) {
    if (epoch === selectionEpoch)
      error.value = e instanceof Error ? e.message : 'Could not decode the selected image.';
  } finally {
    if (epoch === selectionEpoch)
      selectionPending.value = false;
  }
}
function edit() {
  try {
    const resolved = props.repository.resolve(stagedId.value);
    original.value = resolved.original;
    initialFrame.value = selected.value?.ratio === ratio.value ? resolved.frame : undefined;
    error.value = '';
    editing.value = true;
  } catch (e) { error.value = e instanceof Error ? e.message : 'Could not open this image.'; }
}
function apply(blob: Blob, frame: Frame) {
  if (!original.value)
    return;
  const crop = props.repository.add('Cropped image', blob, { originalId: original.value.id, originalRevision: original.value.revision, frame, ratio: ratio.value });
  draftIds.add(crop.id);
  select(crop.id);
  notice.value = 'Crop applied to the parent draft. Save to commit, or cancel the parent.';
}
function save() {
  if (selectionPending.value)
    return;
  cleanupDrafts(stagedId.value);
  draftIds.delete(stagedId.value);
  ratio.value = imageRatio(stagedId.value);
  emit('save', stagedId.value);
  notice.value = 'Parent saved. Use “Fresh mount” to reopen the committed crop.';
}
function cancel() {
  selectionEpoch++;
  selectionPending.value = false;
  editing.value = false;
  cleanupDrafts();
  stagedId.value = props.committedId;
  ratio.value = imageRatio(props.committedId);
  error.value = '';
  notice.value = 'Parent cancelled; the committed selection was restored.';
}
function simulate(kind: 'missing' | 'changed') {
  const id = selected.value?.originalId;
  if (!id) {
    error.value = 'Apply a crop first to simulate an Original problem.';
    return;
  }
  if (kind === 'missing')
    props.repository.remove(id);
  else props.repository.change(id);
  notice.value = `Original marked ${kind}; try Edit image. The crop remains displayable.`;
}
</script>

<template>
  <section class="harness" aria-label="Mock parent form">
    <h2 class="section-title">
      Mock parent form
    </h2>
    <p>Select a fixture or local file to simulate a selected Drive image. Only static JPEG, PNG and WebP are supported.</p>
    <div class="controls">
      <VaButton v-for="id in fixtures" :key="id" preset="secondary" type="button" :disabled="!repository.get(id)" @click="select(id)">
        {{ repository.get(id)?.name || 'Missing fixture' }}
      </VaButton>
      <label class="file-input">Choose local file <input type="file" accept="image/jpeg,image/png,image/webp" @change="fileSelected"></label>
    </div>
    <div class="selection">
      <img v-if="imageUrl" :src="imageUrl" alt="Current staged image">
      <div>
        <p><strong>Staged:</strong> {{ selected?.name }} ({{ stagedId }})</p>
        <p><strong>Committed:</strong> {{ committedId }}</p>
        <p v-if="selected?.originalId">
          <strong>Original:</strong> {{ selected.originalId }} · revision {{ selected.originalRevision }}<br><strong>Stored frame:</strong> {{ selected.frame }}
        </p>
        <label>Frame shape <select v-model.number="ratio"><option :value="1">Square 1:1</option><option :value="2">Landscape 2:1</option></select></label>
        <div class="controls">
          <VaButton type="button" :disabled="!selected" @click="edit">
            Edit image
          </VaButton><a v-if="imageUrl" :href="imageUrl" download="lab-image.png">Download staged image</a>
        </div>
      </div>
    </div>
    <p v-if="selectionPending" role="status">
      Loading selected image…
    </p>
    <p v-if="error" role="alert" class="error">
      {{ error }}
    </p>
    <p v-if="notice" role="status">
      {{ notice }}
    </p>
    <div class="controls">
      <VaButton type="button" :disabled="selectionPending || stagedId === committedId" @click="save">
        Parent Save
      </VaButton>
      <VaButton preset="secondary" type="button" :disabled="!selectionPending && stagedId === committedId && ratio === imageRatio(committedId)" @click="cancel">
        Parent Cancel
      </VaButton>
      <VaButton preset="secondary" type="button" @click="cancel(); emit('remount')">
        Fresh mount from saved selection
      </VaButton>
    </div>
    <h3 class="section-title">
      Failure simulations
    </h3>
    <p>These mutate only the in-memory Original, not the displayed crop. Create a crop first.</p>
    <div class="controls">
      <VaButton preset="secondary" type="button" @click="simulate('missing')">
        Make Original missing
      </VaButton><VaButton preset="secondary" type="button" @click="simulate('changed')">
        Change Original revision
      </VaButton>
    </div>
    <DevImageFramingEditor v-if="editing && original" :original="original" :initial-frame="initialFrame" :ratio="ratio" @cancel="editing = false" @apply="apply" />
  </section>
</template>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 1rem;
}
.harness p {
  margin: 0.75rem 0;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin: 0.8rem 0;
}
select,
input[type='file'] {
  padding: 0.4rem;
  color: var(--va-text-primary);
}
select,
option {
  background-color: var(--va-background-element);
}
.file-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.selection {
  background: var(--va-background-element);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: start;
}
.selection img {
  width: 160px;
  height: 160px;
  object-fit: contain;
  background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 20px 20px;
}
.error {
  color: var(--va-danger);
}
</style>
