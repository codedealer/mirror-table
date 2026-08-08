<script setup lang="ts">
import type { DriveWidget, ModalWindow, WidgetNimbleGroup } from '~/models/types';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, doc } from 'firebase/firestore';
import { sortNimbleActors, WidgetNimbleGroupFactory } from '~/models/NimbleGroup';
import { ModalWindowStatus } from '~/models/types';

const props = defineProps<{ window: ModalWindow; file?: DriveWidget; blocked?: boolean }>();
const widgetStore = useWidgetStore();
const windowStore = useWindowStore();
const userStore = useUserStore();
const tableStore = useTableStore();
const { $db } = useNuxtApp();

const widgetRef = computed(() => props.file?.appProperties.firestoreId && userStore.user
  ? doc(collection($db, 'users', userStore.user.uid, 'widgets'), props.file.appProperties.firestoreId).withConverter(firestoreDataConverter<WidgetNimbleGroup>())
  : undefined);
const widget = useFirestore(widgetRef);
const actors = computed(() => sortNimbleActors(widget.value?.actors ?? []));
const editorActorId = ref<string | undefined>();
const isEditorOpen = ref(false);
const canEdit = computed(() => tableStore.mode === TableModes.OWN && !props.file?.trashed);

const isLoading = computed(() => props.window.status === ModalWindowStatus.LOADING || !!props.file?.loading || (!!props.file?.appProperties.firestoreId && widget.value === undefined));
const isDisabled = computed(() => isLoading.value || !!props.blocked);

const openActorEditor = (actorId?: string) => {
  if (!canEdit.value)
    return;
  editorActorId.value = actorId;
  isEditorOpen.value = true;
};
const closeActorEditor = () => {
  isEditorOpen.value = false;
  editorActorId.value = undefined;
};

const createOrUpdateWidget = async () => {
  if (!props.file || isDisabled.value || !canEdit.value)
    return;
  windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);
  try {
    if (!widget.value) {
      const created = await widgetStore.createWidget(WidgetNimbleGroupFactory(props.file.id));
      if (!created)
        throw new Error('Failed to create widget');
      const driveFileStore = useDriveFileStore();
      await driveFileStore.saveFile(props.file.id, { ...props.file.appProperties, firestoreId: created.id }, props.file.name);
    } else {
      await widgetStore.updateWidget<WidgetNimbleGroup>(widget.value.id, { enabled: widget.value.enabled });
    }
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (error) {
    useNotificationStore().error(extractErrorMessage(error));
    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  }
};

const removeActor = async (id: string) => canEdit.value && widget.value && widgetStore.removeNimbleActor(widget.value.id, id);
const toggleActor = async (id: string) => canEdit.value && widget.value && widgetStore.toggleNimbleActor(widget.value.id, id);
const draggedActorId = ref<string>();
const startActorDrag = (event: DragEvent, id: string) => {
  if (!canEdit.value)
    return;
  draggedActorId.value = id;
  event.dataTransfer?.setData('text/plain', id);
  if (event.dataTransfer)
    event.dataTransfer.effectAllowed = 'move';
};
const endActorDrag = () => {
  draggedActorId.value = undefined;
};
const moveActor = async (id: string, offset: -1 | 1) => {
  if (!canEdit.value || !widget.value)
    return;
  const index = actors.value.findIndex(actor => actor.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= actors.value.length)
    return;
  const ids = actors.value.map(actor => actor.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await widgetStore.reorderNimbleActors(widget.value.id, ids);
};
const dropActor = async (targetId: string) => {
  if (!canEdit.value || !widget.value || !draggedActorId.value || draggedActorId.value === targetId)
    return;
  const ids = actors.value.map(actor => actor.id).filter(id => id !== draggedActorId.value);
  ids.splice(ids.indexOf(targetId), 0, draggedActorId.value);
  draggedActorId.value = undefined;
  await widgetStore.reorderNimbleActors(widget.value.id, ids);
};

watch(() => props.window.content.data, (data) => {
  if (canEdit.value && data && typeof data === 'object' && 'actorId' in data)
    openActorEditor(data.actorId as string);
}, { immediate: true });
</script>

<template>
  <div class="window-container-widget-nimble">
    <va-inner-loading :loading="isLoading">
      <va-button class="mb" preset="outlined" icon="add" :disabled="isDisabled || !widget || !canEdit" @click="openActorEditor()">
        Add entry
      </va-button>
      <va-list v-if="widget" fit-height>
        <va-list-item v-for="(actor, index) in actors" :key="actor.id" tabindex="0" @keydown.up.prevent="moveActor(actor.id, -1)" @keydown.down.prevent="moveActor(actor.id, 1)">
          <div class="nimble-actor-reorder-target" :draggable="canEdit" @dragstart="startActorDrag($event, actor.id)" @dragend="endActorDrag" @dragover.prevent @drop.stop="dropActor(actor.id)">
            <va-list-item-section>
              <va-list-item-label>{{ actor.name }}</va-list-item-label>
              <va-list-item-label caption>
                {{ actor.type }}{{ actor.role ? ` - ${actor.role}` : '' }}
              </va-list-item-label>
            </va-list-item-section>
            <va-list-item-section icon>
              <va-button v-if="canEdit" preset="plain" icon="arrow_upward" :disabled="index === 0" :aria-label="`Move ${actor.name} up`" @click="moveActor(actor.id, -1)" />
              <va-button v-if="canEdit" preset="plain" icon="arrow_downward" :disabled="index === actors.length - 1" :aria-label="`Move ${actor.name} down`" @click="moveActor(actor.id, 1)" />
              <va-button v-if="canEdit" preset="plain" :icon="actor.enabled ? 'visibility' : 'visibility_off'" :aria-label="`Toggle ${actor.name}`" @click="toggleActor(actor.id)" />
              <va-button v-if="canEdit" preset="plain" icon="edit" :aria-label="`Edit ${actor.name}`" @click="openActorEditor(actor.id)" />
              <va-button v-if="canEdit" preset="plain" icon="close" :aria-label="`Remove ${actor.name}`" @click="removeActor(actor.id)" />
            </va-list-item-section>
          </div>
        </va-list-item>
      </va-list>
      <p v-else class="text-secondary">
        Save empty group, then add entries.
      </p>
      <va-modal v-model="isEditorOpen" hide-default-actions size="small" @update:model-value="!$event && closeActorEditor()">
        <h2 class="va-h2">
          {{ editorActorId ? 'Edit entry' : 'Add entry' }}
        </h2>
        <WindowContainerWidgetNimbleGroupActor v-if="widget" :widget-id="widget.id" :actor-id="editorActorId" :upload-parent-id="file?.parents?.[0]" :can-edit="canEdit" @close="closeActorEditor" />
      </va-modal>
      <va-divider />
      <va-button preset="outlined" :loading="props.window.status === ModalWindowStatus.LOADING" :disabled="isDisabled || !canEdit" @click="createOrUpdateWidget">
        Save group
      </va-button>
    </va-inner-loading>
  </div>
</template>

<style scoped lang="scss">
.nimble-actor-reorder-target {
  align-items: center;
  display: flex;
  flex: 1;
  min-width: 0;
}
</style>
