<script setup lang="ts">
import type { Frame, MockImage, MockImageRepository } from '~/utils/image-framing/mock';
import { targetSize } from '~/utils/image-framing/geometry';
import { CropInteraction } from '~/utils/image-framing/interaction';
import { isAnimated } from '~/utils/image-framing/mock';
import { CropSession } from '~/utils/image-framing/session';

const props = defineProps<{ repository: MockImageRepository; fixtures: string[]; committedId: string; persist: (id: string) => Promise<void> }>();
const emit = defineEmits<{ save: [id: string]; remount: [] }>();
// Unmarked Originals have no stored shape; use the same square default on
// selection, cancellation and a fresh mount.
const imageRatio = (id: string) => props.repository.get(id)?.ratio ?? 1;
const session = reactive(new CropSession<MockImage>({
  resolve: async (id) => {
    const result = props.repository.resolve(id);
    return { source: { ...result.original }, frame: result.frame };
  },
  upload: async (source, blob, frame, ratio) => {
    if (props.repository.get(source.id)?.revision !== source.revision)
      throw new Error('The Original has changed.');
    return props.repository.add('Cropped image', blob, { originalId: source.id, originalRevision: source.revision, frame, ratio }).id;
  },
  validate: async (id, source, frame, ratio) => {
    const crop = props.repository.get(id);
    const original = props.repository.get(source.id);
    if (!crop || !original || crop.originalId !== source.id || crop.originalRevision !== original.revision
      || JSON.stringify(crop.frame) !== JSON.stringify(frame) || crop.ratio !== ratio) {
      throw new Error('The uploaded crop metadata is invalid.');
    }
    const bitmap = await createImageBitmap(crop.blob);
    const target = targetSize(ratio);
    const valid = bitmap.width === target.width && bitmap.height === target.height;
    bitmap.close();
    if (!valid)
      throw new Error('The uploaded crop dimensions are invalid.');
  },
  trash: async id => props.repository.remove(id),
}, props.committedId));
const interaction = shallowReactive(new CropInteraction(session));
const stagedId = computed(() => session.stagedId);
const ratio = ref(imageRatio(props.committedId));
const editing = ref(false);
const error = ref('');
const notice = ref('');
const imageUrl = ref('');
const selectionPending = ref(false);
const selected = computed(() => props.repository.get(stagedId.value));
let selectionEpoch = 0;

watch(selected, (image) => {
  if (imageUrl.value)
    URL.revokeObjectURL(imageUrl.value);
  imageUrl.value = image ? URL.createObjectURL(image.blob) : '';
}, { immediate: true });
// The lab only changes `committedId` via its own save emit or remount, but a
// future lab feature could mutate the parent record in place; synchronize the
// session with external parent updates so the two cannot diverge.
watch(() => props.committedId, (id) => {
  if (id !== session.committedId) {
    session.syncCommitted(id);
    ratio.value = imageRatio(id);
  }
});
onBeforeUnmount(() => {
  selectionEpoch++;
  if (imageUrl.value)
    URL.revokeObjectURL(imageUrl.value);
  session.dispose();
});
function select(id: string) {
  if (session.saving)
    return false;
  selectionEpoch++;
  selectionPending.value = false;
  editing.value = false;
  interaction.cancel();
  if (!session.select(id))
    return false;
  ratio.value = imageRatio(id);
  error.value = '';
  notice.value = 'Selection staged. Save to commit it.';
  return true;
}
async function fileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || session.saving)
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
async function edit() {
  const resolved = await interaction.begin();
  if (!resolved) {
    // The session surfaces resolve failures itself and shows work-in-progress
    // status while pending; report anything else instead of failing silently.
    if (!session.error && !session.pending && !session.saving)
      error.value = 'Could not open the image editor. Please try again.';
    return;
  }
  interaction.initialFrame = selected.value?.ratio === ratio.value ? resolved.frame : undefined;
  error.value = '';
  editing.value = true;
}
async function apply(blob: Blob, frame: Frame) {
  editing.value = false;
  const applied = await interaction.apply(blob, frame, ratio.value);
  if (applied)
    notice.value = 'Crop applied to the parent draft. Save to commit, or cancel the parent.';
}
function cancelEdit() {
  editing.value = false;
  interaction.cancel();
}
async function save() {
  if (selectionPending.value)
    return;
  const saved = await session.save(async (id) => {
    await props.persist(id);
    // Publish the committed value only after the parent persistence succeeds.
    emit('save', id);
  });
  if (saved) {
    ratio.value = imageRatio(stagedId.value);
    notice.value = 'Parent saved. Use “Fresh mount” to reopen the committed crop.';
  }
}
function cancel() {
  if (session.saving)
    return;
  selectionEpoch++;
  selectionPending.value = false;
  editing.value = false;
  interaction.cancel();
  session.cancel();
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
      <VaButton v-for="id in fixtures" :key="id" preset="secondary" type="button" :disabled="!repository.get(id) || session.saving" @click="select(id)">
        {{ repository.get(id)?.name || 'Missing fixture' }}
      </VaButton>
      <label class="file-input">Choose local file <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="selectionPending || session.saving" @change="fileSelected"></label>
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
          <VaButton type="button" :disabled="!selected || session.pending || session.saving" @click="edit">
            Edit image
          </VaButton><a v-if="imageUrl" :href="imageUrl" download="lab-image.png">Download staged image</a>
        </div>
      </div>
    </div>
    <p v-if="selectionPending || session.pending || session.saving" role="status">
      Working on image…
    </p>
    <p v-if="error || session.error" role="alert" class="error">
      {{ error || session.error }}
    </p>
    <p v-if="session.cleanupFailed" role="alert">
      A draft crop could not be removed. It has been retained.
      <VaButton preset="secondary" type="button" @click="session.cleanup()">
        Retry cleanup
      </VaButton>
    </p>
    <p v-if="notice" role="status">
      {{ notice }}
    </p>
    <div class="controls">
      <VaButton type="button" :disabled="selectionPending || session.pending || session.saving || stagedId === committedId" @click="save">
        Parent Save
      </VaButton>
      <VaButton preset="secondary" type="button" :disabled="session.saving || (!selectionPending && !session.pending && stagedId === committedId && ratio === imageRatio(committedId))" @click="cancel">
        Parent Cancel
      </VaButton>
      <VaButton preset="secondary" type="button" :disabled="session.saving" @click="cancel(); emit('remount')">
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
    <ImageFramingEditor v-if="editing && interaction.source" :source="interaction.source.blob" :initial-frame="interaction.initialFrame" :ratio="ratio" @cancel="cancelEdit" @apply="apply" />
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
