<script setup lang="ts">
import type { PreviewProperties, WidgetNimbleGroup, WidgetNimbleGroupActor } from '~/models/types';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, doc } from 'firebase/firestore';
import { WidgetNimbleGroupActorNpcFactory, WidgetNimbleGroupActorPlayerFactory } from '~/models/NimbleGroup';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';

const props = defineProps<{
  widgetId: string;
  actorId?: string;
  uploadParentId?: string;
  canEdit?: boolean;
}>();
const emit = defineEmits<{ close: [] }>();

const widgetStore = useWidgetStore();
const userStore = useUserStore();
const { $db } = useNuxtApp();
const widgetRef = computed(() => userStore.user
  ? doc(collection($db, 'users', userStore.user.uid, 'widgets'), props.widgetId).withConverter(firestoreDataConverter<WidgetNimbleGroup>())
  : undefined);
const widget = useFirestore(widgetRef);
const actor = computed(() => widget.value?.actors.find(item => item.id === props.actorId));
const type = ref<'player' | 'npc'>(actor.value?.type ?? 'player');
const name = ref('');
const role = ref('');
const content = ref('');
const privateContent = ref('');
const avatar = ref<PreviewProperties | null>(null);
const player = ref(WidgetNimbleGroupActorPlayerFactory().player);
const npc = ref(WidgetNimbleGroupActorNpcFactory().npc);
npc.value.hitPool = [0];
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
    if (!npc.value.hitPool.length)
      npc.value.hitPool.push(0);
  }
}, { immediate: true });

const addNpcHitPool = () => {
  npc.value.hitPool.push(0);
};

const removeNpcHitPool = (index: number) => {
  if (npc.value.hitPool.length > 1)
    npc.value.hitPool.splice(index, 1);
};

const saveAvatar = (fileId?: string) => {
  if (props.canEdit === false)
    return;
  imageFileId.value = fileId ?? '';
  avatar.value = fileId && imageFile.value
    ? PreviewPropertiesFactory({ id: fileId, nativeWidth: imageFile.value.imageMediaMetadata?.width, nativeHeight: imageFile.value.imageMediaMetadata?.height })
    : null;
};
watch(imageFile, (value) => {
  if (value && imageFileId.value)
    saveAvatar(imageFileId.value);
});

const buildActor = (): WidgetNimbleGroupActor => {
  const shared = {
    id: props.actorId ?? crypto.randomUUID(),
    name: name.value.trim(),
    role: role.value.trim(),
    avatar: avatar.value,
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

const save = async () => {
  if (props.canEdit === false || !widget.value || !name.value.trim())
    return;
  const next = buildActor();
  if (props.actorId)
    await widgetStore.updateNimbleActor(widget.value.id, props.actorId, next);
  else await widgetStore.addNimbleActor(widget.value.id, next);
  emit('close');
};
</script>

<template>
  <va-form class="vertical-form" @submit.prevent="save">
    <va-select v-model="type" label="Type" :options="['player', 'npc']" :disabled="!!actorId || canEdit === false" />
    <div class="nimble-actor-editor__avatar">
      <DriveThumbnail
        :file="imageFile"
        :error="imageError"
        :file-is-loading="imageLoading"
        :upload-parent-id="uploadParentId"
        width="96"
        height="96"
        :allow-upload="canEdit !== false"
        :removable="canEdit !== false"
        @upload="saveAvatar"
        @remove="saveAvatar()"
      />
    </div>
    <va-input v-model="name" label="Name" required :disabled="canEdit === false" />
    <va-input v-model="role" label="Role" :disabled="canEdit === false" />
    <va-input v-if="type === 'player'" v-model="player.speed" label="Speed" />
    <va-input v-else v-model="npc.speed" label="Speed" />
    <fieldset :disabled="canEdit === false">
      <template v-if="type === 'player'">
        <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--three">
          <va-input v-model.number="player.hitPoints.current" class="nimble-actor-editor__numeric-input" type="number" label="Current HP" />
          <va-input v-model.number="player.hitPoints.max" class="nimble-actor-editor__numeric-input" type="number" label="Max HP" />
          <va-input v-model.number="player.hitPoints.temp" class="nimble-actor-editor__numeric-input" type="number" label="Temp HP" />
        </div>
        <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--three">
          <va-input v-model.number="player.wounds.current" class="nimble-actor-editor__numeric-input" type="number" label="Current wounds" />
          <va-input v-model.number="player.wounds.max" class="nimble-actor-editor__numeric-input" type="number" label="Max wounds" />
          <va-input v-model.number="player.armor" class="nimble-actor-editor__numeric-input" type="number" label="Armor" />
        </div>
        <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--four">
          <va-input v-model.number="player.stats.wil" class="nimble-actor-editor__numeric-input" type="number" label="Wil" />
          <va-input v-model.number="player.stats.str" class="nimble-actor-editor__numeric-input" type="number" label="Str" />
          <va-input v-model.number="player.stats.dex" class="nimble-actor-editor__numeric-input" type="number" label="Dex" />
          <va-input v-model.number="player.stats.int" class="nimble-actor-editor__numeric-input" type="number" label="Int" />
        </div>
      </template>
      <template v-else>
        <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--two">
          <va-select v-model="npc.subtype" label="Subtype" :options="['minion', 'flunky', 'regular', 'legendary']" />
          <va-select v-model="npc.armor" label="Armor" :options="['', 'medium', 'heavy']" />
        </div>
        <div class="nimble-actor-editor__hit-pool">
          <div v-for="(hitPoints, index) in npc.hitPool" :key="index" class="nimble-actor-editor__hit-pool-entry">
            <va-input
              v-model.number="npc.hitPool[index]"
              class="nimble-actor-editor__hit-pool-input"
              type="number"
              :label="`HP ${index + 1}`"
              min="0"
              max="999"
              :disabled="canEdit === false"
            />
            <va-button
              v-if="npc.hitPool.length > 1"
              preset="plain"
              icon="close"
              type="button"
              :aria-label="`Remove HP ${index + 1}`"
              title="Remove hit pool entry"
              :disabled="canEdit === false"
              @click="removeNpcHitPool(index)"
            />
          </div>
          <va-button
            preset="plain"
            icon="add"
            type="button"
            aria-label="Add hit pool entry"
            title="Add hit pool entry"
            :disabled="canEdit === false"
            @click="addNpcHitPool"
          />
        </div>
        <div class="nimble-actor-editor__field-grid nimble-actor-editor__field-grid--four">
          <va-input v-model.number="npc.stats.wil" class="nimble-actor-editor__numeric-input" type="number" label="Wil" />
          <va-input v-model.number="npc.stats.str" class="nimble-actor-editor__numeric-input" type="number" label="Str" />
          <va-input v-model.number="npc.stats.dex" class="nimble-actor-editor__numeric-input" type="number" label="Dex" />
          <va-input v-model.number="npc.stats.int" class="nimble-actor-editor__numeric-input" type="number" label="Int" />
        </div>
      </template>
      <div class="nimble-actor-editor__field-row">
        <va-textarea v-model="content" label="Content" autosize :min-rows="2" :disabled="canEdit === false" />
      </div>
      <div class="nimble-actor-editor__field-row">
        <va-textarea v-model="privateContent" label="Private content" autosize :min-rows="2" :disabled="canEdit === false" />
      </div>
    </fieldset>
    <div class="vertical-form__actions">
      <va-button preset="plain" type="button" @click="emit('close')">
        Cancel
      </va-button>
      <va-button type="submit" :disabled="!name.trim() || canEdit === false">
        {{ actorId ? 'Update entry' : 'Add entry' }}
      </va-button>
    </div>
  </va-form>
</template>

<style scoped lang="scss">
.nimble-actor-editor__field-grid {
  display: grid;
  gap: 0.75rem;
  align-items: start;
}

.nimble-actor-editor__field-row {
  width: 100%;
}

.nimble-actor-editor__hit-pool {
  display: flex;
  gap: 0.25rem;
  align-items: end;
  flex-wrap: wrap;
}

.nimble-actor-editor__hit-pool-entry {
  display: flex;
  gap: 0.125rem;
  align-items: end;
}

.nimble-actor-editor__hit-pool-input {
  width: 4.5rem;
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

.nimble-actor-editor__numeric-input {
  min-width: 0;
  max-width: 7rem;
}

.nimble-actor-editor__field-grid + .nimble-actor-editor__field-grid,
.nimble-actor-editor__field-grid + .va-input,
.va-input + .nimble-actor-editor__field-grid,
.nimble-actor-editor__field-grid + .va-textarea {
  margin-top: 0.25rem;
}

@media (max-width: 34rem) {
  .nimble-actor-editor__field-grid--four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nimble-actor-editor__numeric-input {
    max-width: none;
  }
}
</style>
