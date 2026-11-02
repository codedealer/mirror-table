<script setup lang="ts">
import type { PreviewProperties, WidgetNimbleGroup, WidgetNimbleGroupActor } from '~/models/types';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, doc } from 'firebase/firestore';
import EditableDriveThumbnail from '~/components/EditableDriveThumbnail.vue';
import { WidgetNimbleGroupActorNpcFactory, WidgetNimbleGroupActorPlayerFactory } from '~/models/NimbleGroup';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';
import { buildNimbleActorAvatar, saveNimbleActorForm } from '~/utils/image-framing/nimbleActorForm';

const props = defineProps<{
  widgetId: string;
  actorId?: string;
  uploadParentId?: string;
  canEdit?: boolean;
}>();
const emit = defineEmits<{ close: []; busy: [busy: boolean] }>();

const widgetStore = useWidgetStore();
const userStore = useUserStore();
const { $db } = useNuxtApp();
const widgetRef = computed(() => userStore.user
  ? doc(collection($db, 'users', userStore.user.uid, 'widgets'), props.widgetId).withConverter(firestoreDataConverter<WidgetNimbleGroup>())
  : undefined);
const widget = useFirestore(widgetRef);
const actor = computed(() => widget.value && props.actorId
  ? widget.value.actors.find(item => item.id === props.actorId)
  : undefined);
const type = ref<'player' | 'npc'>(actor.value?.type ?? 'player');
const name = ref('');
const role = ref('');
const content = ref('');
const privateContent = ref('');
const avatar = ref<PreviewProperties | null>(null);
const player = ref(WidgetNimbleGroupActorPlayerFactory().player);
const npc = ref(WidgetNimbleGroupActorNpcFactory().npc);
const imageFileId = ref('');
const { file: imageFile, isLoading: imageLoading, error: imageError } = useDriveFile(imageFileId, {
  strategy: DataRetrievalStrategies.RECENT,
});

watch(actor, (value) => {
  if (!value)
    return;
  type.value = value.type;
  name.value = value.name;
  role.value = value.role;
  content.value = value.content;
  privateContent.value = value.privateContent;
  avatar.value = value.avatar;
  imageFileId.value = value.avatar?.id ?? '';
  if (value.type === 'player') {
    player.value = structuredClone(toRaw(value.player));
  } else {
    npc.value = structuredClone(toRaw(value.npc));
  }
}, { immediate: true });

const addNpcHitPool = () => {
  npc.value.hitPool.push({ current: 0, max: '', temp: '' });
};

const removeNpcHitPool = (index: number) => {
  if (npc.value.hitPool.length > 1)
    npc.value.hitPool.splice(index, 1);
};

const stageAvatar = (fileId: string) => {
  if (props.canEdit === false)
    return;
  imageFileId.value = fileId;
};

const removeAvatar = () => {
  if (props.canEdit === false)
    return;
  imageFileId.value = '';
  avatar.value = null;
};

watch(imageFile, (value) => {
  if (props.canEdit === false)
    return;
  // Stage the loaded image's actual dimensions, but only while it is still the
  // current selection: a late load must never overwrite the staged selection
  // or attach a previous image's dimensions to it.
  if (value && imageFileId.value && value.id === imageFileId.value && !imageLoading.value)
    avatar.value = PreviewPropertiesFactory({ id: imageFileId.value, nativeWidth: value.imageMediaMetadata?.width, nativeHeight: value.imageMediaMetadata?.height });
});

// The avatar carries the staged image's dimensions; block saving only while the
// currently selected image metadata is still loading. A failed load keeps the
// previous behaviour instead of wedging the form.
const avatarReady = computed(() => !imageFileId.value || !!imageFile.value || !!imageError.value);
const editableThumbnail = ref<InstanceType<typeof EditableDriveThumbnail>>();
const thumbnailPending = computed(() => !!editableThumbnail.value?.pending);
const thumbnailError = ref('');
const onThumbnailError = (message: string) => {
  thumbnailError.value = message;
  console.error(message);
};

const buildActor = (imageId: string): WidgetNimbleGroupActor => {
  const matchingFile = imageFile.value?.id === imageId ? imageFile.value : undefined;
  // Keep matching staged dimensions if selection changes during a save; a reset
  // can instead fall back to the persisted actor's matching image dimensions.
  const fallbackAvatar = avatar.value?.id === imageId ? avatar.value : actor.value?.avatar ?? null;
  const savedAvatar = buildNimbleActorAvatar(imageId, matchingFile, fallbackAvatar);
  const shared = {
    id: props.actorId ?? crypto.randomUUID(),
    name: name.value.trim(),
    role: role.value.trim(),
    avatar: savedAvatar,
    conditions: actor.value?.conditions ?? [],
    content: content.value,
    privateContent: privateContent.value,
    enabled: actor.value?.enabled ?? false,
    rank: actor.value?.rank ?? widget.value?.actors.length ?? 0,
  };
  return type.value === 'player'
    ? { ...shared, type: 'player', player: toRaw(player.value) }
    : { ...shared, type: 'npc', npc: toRaw(npc.value) };
};

const saveInProgress = ref(false);
const closeBlocked = computed(() => saveInProgress.value || thumbnailPending.value);
watch(closeBlocked, busy => emit('busy', busy), { immediate: true, flush: 'sync' });

const cancel = () => {
  if (closeBlocked.value)
    return;
  // Restore the previously committed image and let the session clean its drafts.
  editableThumbnail.value?.cancelParent();
  emit('close');
};

const save = async () => {
  if (saveInProgress.value || props.canEdit === false || !widget.value || !name.value.trim() || !avatarReady.value || thumbnailPending.value)
    return;
  thumbnailError.value = '';
  const thumbnail = editableThumbnail.value;
  if (!thumbnail)
    return;

  saveInProgress.value = true;
  try {
    const saved = await saveNimbleActorForm({
      saveParent: persist => thumbnail.saveParent(persist),
      buildActor,
      getWidgetId: () => widget.value?.id,
      actorId: props.actorId,
      store: widgetStore,
      close: () => {
        // Clear the parent dismissal guard before closing after confirmed persistence.
        saveInProgress.value = false;
        emit('busy', false);
        emit('close');
      },
    });
    if (!saved) {
      const notificationStore = useNotificationStore();
      notificationStore.error(thumbnailError.value || 'Failed to save the entry. The image selection was retained.');
    }
  } finally {
    saveInProgress.value = false;
  }
};
</script>

<template>
  <va-form class="nimble-actor-editor vertical-form" @submit.prevent="save">
    <va-scroll-container vertical class="nimble-actor-editor__scroll">
      <div class="nimble-actor-editor__fields">
        <va-select v-model="type" label="Type" :options="['player', 'npc']" :disabled="!!actorId || canEdit === false" />
        <div class="nimble-actor-editor__profile">
          <EditableDriveThumbnail
            ref="editableThumbnail"
            :selected-id="imageFileId"
            :committed-id="actor?.avatar?.id ?? ''"
            :record-key="actorId ?? 'new'"
            :upload-parent-id="uploadParentId"
            width="96"
            height="96"
            fit="auto"
            :editable="canEdit !== false"
            :removable="canEdit !== false"
            @select="stageAvatar"
            @remove="removeAvatar"
            @error="onThumbnailError"
          />
          <div class="nimble-actor-editor__identity">
            <va-input v-model="name" label="Name" required :disabled="canEdit === false" />
            <va-input v-model="role" label="Role" :disabled="canEdit === false" />
          </div>
        </div>
        <fieldset class="nimble-actor-editor__details" :disabled="canEdit === false">
          <template v-if="type === 'player'">
            <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--two">
              <va-input v-model="player.speed" label="Speed" />
              <va-input v-model.number="player.armor" type="number" label="Armor" />
            </div>
            <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--three">
              <va-input v-model.number="player.hitPool[0].current" type="number" label="Current HP" />
              <va-input v-model.number="player.hitPool[0].max" type="number" label="Max HP" />
              <va-input v-model.number="player.hitPool[0].temp" type="number" label="Temp HP" />
            </div>
            <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--two">
              <va-input v-model.number="player.wounds.current" type="number" label="Current wounds" />
              <va-input v-model.number="player.wounds.max" type="number" label="Max wounds" />
            </div>
            <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--four">
              <va-input v-model.number="player.stats.wil" type="number" label="Wil" />
              <va-input v-model.number="player.stats.str" type="number" label="Str" />
              <va-input v-model.number="player.stats.dex" type="number" label="Dex" />
              <va-input v-model.number="player.stats.int" type="number" label="Int" />
            </div>
          </template>
          <template v-else>
            <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--three">
              <va-input v-model="npc.speed" label="Speed" />
              <va-select v-model="npc.subtype" label="Subtype" :options="['minion', 'flunky', 'regular', 'legendary']" />
              <va-select v-model="npc.armor" label="Armor" :options="['', 'medium', 'heavy']" />
            </div>
            <div class="nimble-actor-editor__hit-pool">
              <strong>Hitpoint pool</strong>
              <div v-for="(hitPoints, index) in npc.hitPool" :key="index" class="nimble-actor-editor__hit-pool-entry">
                <va-input
                  v-model.number="hitPoints.current"
                  class="nimble-actor-editor__hit-pool-input"
                  type="number"
                  :label="`HP ${index + 1}`"
                  min="0"
                  max="999"
                />
                <va-input v-model.number="hitPoints.max" class="nimble-actor-editor__hit-pool-input" type="number" label="Max" min="0" max="999" />
                <va-input v-model.number="hitPoints.temp" class="nimble-actor-editor__hit-pool-input" type="number" label="Temp" min="0" max="999" />
                <va-button
                  v-if="npc.hitPool.length > 1"
                  preset="plain"
                  icon="close"
                  type="button"
                  :aria-label="`Remove HP ${index + 1}`"
                  title="Remove hit pool entry"
                  @click="removeNpcHitPool(index)"
                />
              </div>
              <va-button
                preset="plain"
                icon="add"
                type="button"
                aria-label="Add hit pool entry"
                title="Add hit pool entry"
                @click="addNpcHitPool"
              />
            </div>
            <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--four">
              <va-input v-model.number="npc.stats.wil" type="number" label="Wil" />
              <va-input v-model.number="npc.stats.str" type="number" label="Str" />
              <va-input v-model.number="npc.stats.dex" type="number" label="Dex" />
              <va-input v-model.number="npc.stats.int" type="number" label="Int" />
            </div>
          </template>
          <va-textarea
            v-model="content"
            label="Content"
            placeholder="Enter markdown here"
            autosize
            :min-rows="2"
            :max-rows="12"
          />
          <va-textarea
            v-model="privateContent"
            label="Private content"
            placeholder="Only visible to the owner"
            autosize
            :min-rows="2"
            :max-rows="12"
          />
        </fieldset>
      </div>
    </va-scroll-container>
    <div class="vertical-form__actions nimble-actor-editor__actions">
      <va-button preset="plain" type="button" :disabled="closeBlocked" @click="cancel">
        Cancel
      </va-button>
      <va-button type="submit" :loading="saveInProgress" :disabled="!name.trim() || canEdit === false || !avatarReady || thumbnailPending">
        {{ actorId ? 'Update entry' : 'Add entry' }}
      </va-button>
    </div>
  </va-form>
</template>

<style scoped lang="scss">
.nimble-actor-editor {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: calc(100dvh - 10rem);
  min-height: 0;
  overflow: hidden;
}

.nimble-actor-editor__scroll {
  flex: 1 1 auto;
  max-height: calc(100dvh - 15rem);
  min-height: 0;
}

.nimble-actor-editor__fields {
  display: grid;
  gap: 0.75rem;
  padding: 0.25rem 0.125rem 0.75rem;
}

.nimble-actor-editor__profile {
  align-items: start;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 6rem minmax(0, 1fr);
}

.nimble-actor-editor__identity {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.nimble-actor-editor__details {
  border: 0;
  display: grid;
  gap: 0.65rem;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.nimble-actor-editor__field-grid {
  align-items: start;
  display: grid;
  gap: 0.65rem;
}

.nimble-actor-editor__hit-pool {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.nimble-actor-editor__hit-pool-entry {
  align-items: end;
  display: grid;
  gap: 0.25rem;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
}

.nimble-actor-editor__hit-pool-input {
  min-width: 0;
}

.nimble-actor-editor__field-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.nimble-actor-editor__field-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.nimble-actor-editor__field-grid--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.nimble-actor-editor__actions {
  align-self: stretch;
  background: transparent;
  bottom: 0;
  flex: 0 0 auto;
  justify-content: flex-end;
  margin-top: 0.25rem;
  padding: 0.25rem 0.125rem 0.125rem;
  position: sticky;
  z-index: 1;
}

@media (max-width: 34rem) {
  .nimble-actor-editor {
    max-height: calc(100dvh - 8rem);
  }

  .nimble-actor-editor__scroll {
    max-height: calc(100dvh - 13rem);
  }

  .nimble-actor-editor__field-grid--four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nimble-actor-editor__field-grid--three {
    gap: 0.4rem;
  }
}
</style>
