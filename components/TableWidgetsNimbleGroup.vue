<script setup lang="ts">
import type { DynamicPanelModelType, NimbleHitPoints, NimbleNumber, WidgetNimbleGroup, WidgetNimbleGroupActorNpc, WidgetNimbleGroupActorPlayer } from '~/models/types';
import { isWidgetNimbleGroupActor, sortNimbleActors } from '~/models/NimbleGroup';

const props = defineProps<{ panel: DynamicPanelModelType; widget: WidgetNimbleGroup }>();
const tableStore = useTableStore();
const widgetStore = useWidgetStore();
const windowStore = useWindowStore();
const isOwner = computed(() => tableStore.mode === TableModes.OWN && !props.widget.trashed);
const actors = computed(() => sortNimbleActors(props.widget.actors.filter(isWidgetNimbleGroupActor)).filter(actor => isOwner.value || actor.enabled));

const addCondition = (actorId: string, condition: string) => {
  if (isOwner.value)
    void widgetStore.addNimbleCondition(props.widget.id, actorId, condition);
};

const updateHitPoints = (actor: WidgetNimbleGroupActorNpc | WidgetNimbleGroupActorPlayer, index: number, hitPoints: NimbleHitPoints) => {
  if (!isOwner.value)
    return;
  if (actor.type === 'player') {
    void widgetStore.updateNimbleActor(props.widget.id, actor.id, { player: { ...actor.player, hitPool: [hitPoints] } });
    return;
  }
  const hitPool = hitPoints.current === ''
    ? actor.npc.hitPool.filter((_, hitPointIndex) => hitPointIndex !== index)
    : actor.npc.hitPool.map((item, hitPointIndex) => hitPointIndex === index ? hitPoints : item);
  void widgetStore.updateNimbleActor(props.widget.id, actor.id, { npc: { ...actor.npc, hitPool } });
};

const updatePlayerWounds = (actor: WidgetNimbleGroupActorPlayer, current: NimbleNumber, max: NimbleNumber) => {
  if (isOwner.value)
    void widgetStore.updateNimbleActor(props.widget.id, actor.id, { player: { ...actor.player, wounds: { current, max } } });
};

const addNpcHitPoint = (actorId: string) => {
  const actor = actors.value.find(item => item.id === actorId);
  if (isOwner.value && actor?.type === 'npc')
    void widgetStore.updateNimbleActor(props.widget.id, actor.id, { npc: { ...actor.npc, hitPool: [...actor.npc.hitPool, { current: 0, max: '', temp: '' }] } });
};

const editActor = (actorId: string) => {
  if (!isOwner.value || !props.widget.fileId)
    return;
  const window = WindowFactory(props.widget.fileId, 'Edit widget', { type: 'widget', editing: true, data: { actorId } });
  const existingWindow = windowStore.windows.find(item => item.id === window.id);
  if (existingWindow)
    existingWindow.content.data = window.content.data;
  windowStore.toggleOrAdd(window, true);
};

const removeActor = (actorId: string) => {
  if (isOwner.value)
    void widgetStore.removeNimbleActor(props.widget.id, actorId);
};

const removeCondition = (actorId: string, condition: string) => {
  if (isOwner.value)
    void widgetStore.removeNimbleCondition(props.widget.id, actorId, condition);
};

const toggleActor = (actorId: string) => {
  if (isOwner.value)
    void widgetStore.toggleNimbleActor(props.widget.id, actorId);
};
</script>

<template>
  <TableWidgetsNimbleGroupContent
    :actors="actors"
    :is-owner="isOwner"
    @add-condition="addCondition"
    @add-npc-hit-point="addNpcHitPoint"
    @edit-actor="editActor"
    @remove-actor="removeActor"
    @remove-condition="removeCondition"
    @toggle-actor="toggleActor"
    @update-hit-points="updateHitPoints"
    @update-player-wounds="updatePlayerWounds"
  >
    <template #controls="{ widgetContentCollapsed, toggleWidgetContent }">
      <TableWidgetsControls :panel="panel" :widget="widget">
        <va-button
          preset="plain"
          :icon="widgetContentCollapsed ? 'unfold_more' : 'unfold_less'"
          :aria-label="widgetContentCollapsed ? 'Expand all actor content' : 'Collapse all actor content'"
          :title="widgetContentCollapsed ? 'Expand all actor content' : 'Collapse all actor content'"
          @click="toggleWidgetContent"
        />
      </TableWidgetsControls>
    </template>
  </TableWidgetsNimbleGroupContent>
</template>
