<script setup lang="ts">
import type { DriveFile } from '~/models/types';
import type { Frame } from '~/utils/image-framing/geometry';
import { DataRetrievalStrategies } from '~/models/types';
import { createDriveCropSessionAdapter, type DriveCropSource } from '~/utils/image-framing/driveAdapter';
import { CropInteraction } from '~/utils/image-framing/interaction';
import { observeParentSelectionProps, ParentSelectionSync } from '~/utils/image-framing/parentSelection';
import { CropSession } from '~/utils/image-framing/session';

const props = withDefaults(defineProps<{
  selectedId: string;
  /** Optional authoritative parent-save value, distinct from its staged selectedId. */
  committedId?: string;
  /** Change when reusing this wrapper for a different parent record with the same image ID. */
  recordKey?: string | number;
  width: string | number;
  height: string | number;
  ratio?: number;
  uploadParentId?: string;
  editable?: boolean;
  /** Keeps the parent's existing remove affordance; removal stages an empty selection. */
  removable?: boolean;
  fit?: 'auto' | 'cover' | 'contain';
}>(), { ratio: 1, uploadParentId: '', editable: true, removable: false, fit: 'contain' });
const emit = defineEmits<{
  select: [id: string];
  committed: [id: string];
  error: [message: string];
  remove: [];
}>();
const userStore = useUserStore();
const folderId = computed(() => props.uploadParentId || userStore.profile?.settings.driveFolderId || '');
const session = reactive(new CropSession<DriveCropSource>(createDriveCropSessionAdapter(() => folderId.value), props.committedId ?? props.selectedId));
// Parent staging and persistence ownership are independent: a distinct initial
// selectedId is visible without being treated as an already-committed value.
if (props.selectedId !== session.stagedId)
  session.select(props.selectedId);
const interaction = shallowReactive(new CropInteraction(session));
const driveFiles = useDriveFileStore();
const file = shallowRef<DriveFile>();
const loadError = ref('');
const editorOpen = ref(false);
const editError = ref('');
const editButtonRef = ref<{ $el?: HTMLElement }>();
const pickerBusy = ref(false);
const imageRatio = computed(() => props.ratio);
let displayEpoch = 0;
let editorTrigger: HTMLElement | undefined;
const pendingSelectionEcho: { value?: string } = {};
let parentSaveActive = false;
const displayedId = computed(() => session.stagedId);
function publishSelection(id: string) {
  pendingSelectionEcho.value = id;
  emit('select', id);
}
const parentSelectionSync = new ParentSelectionSync(
  session,
  () => parentSaveActive || session.saving,
  () => props.selectedId,
  () => cancelEdit(),
  publishSelection,
);

async function loadDisplayFile(id: string) {
  const epoch = ++displayEpoch;
  file.value = undefined;
  loadError.value = '';
  if (!id)
    return;
  try {
    const result = await driveFiles.getFile(id, DataRetrievalStrategies.LAZY);
    if (epoch !== displayEpoch)
      return;
    if (!result.file || result.error)
      throw new Error('Image details are unavailable.');
    file.value = result.file;
  } catch (e) {
    if (epoch === displayEpoch)
      loadError.value = e instanceof Error ? e.message : 'Image details are unavailable.';
  }
}
watch(
  () => [props.recordKey, props.selectedId, props.committedId] as const,
  ([recordKey, selectedId, committedId], [previousRecordKey, previousSelectedId, previousCommittedId]) => {
    observeParentSelectionProps(
      parentSelectionSync,
      { recordKey, selectedId, committedId },
      { recordKey: previousRecordKey, selectedId: previousSelectedId, committedId: previousCommittedId },
      pendingSelectionEcho,
    );
  },
);
watch(displayedId, id => void loadDisplayFile(id), { immediate: true });

onBeforeUnmount(() => session.dispose());

const { buildPicker } = usePicker();
async function pick() {
  if (pickerBusy.value || session.pending || session.saving)
    return;
  pickerBusy.value = true;
  try {
    await buildPicker({
      parentId: userStore.profile?.settings.driveFolderId || folderId.value,
      uploadParentId: folderId.value,
      template: 'images',
      allowUpload: true,
      callback: (result) => {
        if (result.action === google.picker.Action.PICKED && result.docs.length) {
          const id = result.docs[0].id;
          cancelEdit();
          if (session.select(id))
            publishSelection(id);
        }
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not open image selection.';
    loadError.value = message;
    emit('error', message);
  } finally {
    pickerBusy.value = false;
  }
}

async function edit(event: MouseEvent) {
  if (!props.editable)
    return;
  editorTrigger = editButtonRef.value?.$el ?? event.currentTarget as HTMLElement;
  // Resolve through the shared parent/editor interaction boundary.
  const result = await interaction.begin();
  if (!result) {
    // The session surfaces resolve failures itself and shows work-in-progress
    // status while pending; report anything else instead of failing silently.
    if (!session.error && !session.pending && !session.saving)
      editError.value = 'Could not open the image editor. Please try again.';
    return;
  }
  editError.value = '';
  editorOpen.value = true;
}
function restoreEditorFocus() {
  const trigger = editorTrigger;
  if (!trigger?.isConnected)
    return;
  void nextTick(() => {
    let attempts = 0;
    const restore = () => {
      if (!trigger.isConnected || trigger.hasAttribute('disabled'))
        return;
      if (document.activeElement !== trigger)
        trigger.focus({ preventScroll: true });
      if (document.activeElement !== trigger && attempts++ < 10)
        setTimeout(restore, 40);
    };
    setTimeout(restore, 0);
  });
}
function cancelEdit() {
  editorOpen.value = false;
  editError.value = '';
  interaction.cancel();
  restoreEditorFocus();
}
async function apply(blob: Blob, frame: Frame) {
  editorOpen.value = false;
  const applied = await interaction.apply(blob, frame, imageRatio.value);
  if (applied)
    publishSelection(session.stagedId);
  restoreEditorFocus();
}
function removeImage() {
  if (!props.removable || !props.editable)
    return;
  cancelEdit();
  // Removing stages an empty selection through the same parent contract as picking;
  // a draft that was already exposed to the parent is retained by the session.
  if (session.select('')) {
    publishSelection('');
    emit('remove');
  }
}

/** Parent forms call this with their real, awaitable persistence operation. */
async function saveParent(commit: (id: string) => Promise<void>) {
  const savedId = session.stagedId;
  parentSaveActive = true;
  let saved = false;
  try {
    saved = await session.save(commit);
  } finally {
    parentSaveActive = false;
    parentSelectionSync.flush();
  }
  if (saved)
    emit('committed', savedId);
  else if (session.error)
    emit('error', session.error);
  return saved;
}
function cancelParent() {
  cancelEdit();
  session.cancel();
  publishSelection(session.stagedId);
}
function syncCommitted(id: string) {
  pendingSelectionEcho.value = undefined;
  return parentSelectionSync.update({ type: 'committed', id });
}
async function retryCleanup() {
  await session.cleanup();
}
defineExpose({
  pending: computed(() => session.pending || session.saving),
  stagedId: computed(() => session.stagedId),
  saveParent,
  cancelParent,
  syncCommitted,
  retryCleanup,
});
</script>

<template>
  <div class="editable-thumbnail">
    <DriveThumbnail
      :file="file"
      :error="loadError || null"
      :file-is-loading="!file && !loadError && !!displayedId"
      :width="width"
      :height="height"
      :upload-parent-id="uploadParentId"
      :fit="fit"
      :removable="removable && editable && !session.pending && !session.saving"
      @upload="id => { cancelEdit(); if (session.select(id)) publishSelection(id); }"
      @remove="removeImage"
    />
    <div v-if="editable" class="actions">
      <VaPopover
        :message="displayedId ? 'Replace image' : 'Choose image'"
        :aria-label="displayedId ? 'Replace image' : 'Choose image'"
        role="none"
        placement="top"
        trigger="hover"
      >
        <VaButton
          preset="plain"
          color="primary-dark"
          size="medium"
          type="button"
          :icon="displayedId ? 'image_search' : 'add_photo_alternate'"
          :aria-label="displayedId ? 'Replace image' : 'Choose image'"
          :title="displayedId ? 'Replace image' : 'Choose image'"
          :loading="pickerBusy"
          :disabled="pickerBusy || session.pending || session.saving"
          @click="pick"
        />
      </VaPopover>
      <VaPopover message="Edit image" aria-label="Edit image" role="none" placement="top" trigger="hover">
        <VaButton
          ref="editButtonRef"
          preset="plain"
          color="primary-dark"
          size="medium"
          type="button"
          icon="crop"
          aria-label="Edit image"
          title="Edit image"
          :loading="session.pending"
          :disabled="!displayedId || pickerBusy || session.pending || session.saving"
          @click="edit"
        />
      </VaPopover>
    </div>
    <p v-if="session.error" class="error" role="alert">
      {{ session.error }}
    </p>
    <p v-if="editError" class="error" role="alert">
      {{ editError }}
    </p>
    <p v-if="session.cleanupFailed" class="error" role="alert">
      A draft crop could not be removed and was retained.
      <VaButton preset="secondary" type="button" @click="retryCleanup">
        Retry cleanup
      </VaButton>
    </p>
    <ImageFramingEditor v-if="editorOpen && interaction.source" :source="interaction.source.blob" :initial-frame="interaction.initialFrame" :ratio="ratio" @cancel="cancelEdit" @apply="apply" />
  </div>
</template>

<style scoped>
.editable-thumbnail {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.actions :deep(.va-button:focus-visible) {
  outline: 2px solid var(--va-primary);
  outline-offset: 2px;
}
.error {
  color: var(--va-danger);
}
</style>
