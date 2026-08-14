<script setup lang="ts">
import type { NimbleNumber, WidgetNimbleGroup, WidgetNimbleGroupActor, WidgetNimbleGroupActorNpc, WidgetNimbleGroupActorPlayer } from '~/models/types';
import { WidgetNimbleGroupActorNpcFactory, WidgetNimbleGroupActorPlayerFactory, WidgetNimbleGroupFactory } from '~/models/NimbleGroup';

const isOwner = ref(true);
const group = ref<WidgetNimbleGroup>(createMockGroup());

function createMockGroup(): WidgetNimbleGroup {
  const player = WidgetNimbleGroupActorPlayerFactory('aria', 0);
  player.name = 'Aria Venn';
  player.role = 'Duelist';
  player.enabled = true;
  player.conditions = ['Inspired'];
  player.content = 'Keep the pressure on.';
  player.player.hitPoints = { current: 18, max: 24, temp: 2 };
  player.player.wounds = { current: 0, max: 3 };
  player.player.armor = 2;
  player.player.speed = '5';

  const npc = WidgetNimbleGroupActorNpcFactory('warden', 1);
  npc.name = 'Ash Warden';
  npc.role = 'Elite sentinel';
  npc.enabled = true;
  npc.npc.subtype = 'legendary';
  npc.npc.armor = 'heavy';
  npc.npc.speed = '4';
  npc.npc.hitPool = [8, 6];
  npc.conditions = ['Guarding'];

  const hidden = WidgetNimbleGroupActorNpcFactory('scout', 2);
  hidden.name = 'Cinder Scout';
  hidden.role = 'Minion';
  hidden.npc.subtype = 'minion';
  hidden.npc.hitPool = [3];

  return { ...WidgetNimbleGroupFactory('dev-nimble-group'), id: 'dev-nimble-group', enabled: true, actors: [player, npc, hidden] };
}

const toggleActor = (actor: WidgetNimbleGroupActor) => {
  actor.enabled = !actor.enabled;
};

const removeActor = (actorId: string) => {
  group.value.actors = group.value.actors.filter(actor => actor.id !== actorId);
};

const addCondition = (actor: WidgetNimbleGroupActor, condition: string) => {
  if (!actor.conditions.includes(condition))
    actor.conditions.push(condition);
};

const removeCondition = (actor: WidgetNimbleGroupActor, condition: string) => {
  actor.conditions = actor.conditions.filter(item => item !== condition);
};

const addHitPool = (actor: WidgetNimbleGroupActor) => {
  if (actor.type === 'npc')
    actor.npc.hitPool.push(0);
};

const editActor = () => {};

const updatePlayerHitPoints = (actor: WidgetNimbleGroupActorPlayer, current: NimbleNumber, max: NimbleNumber) => {
  actor.player.hitPoints = { ...actor.player.hitPoints, current, max };
};

const updatePlayerWounds = (actor: WidgetNimbleGroupActorPlayer, current: NimbleNumber, max: NimbleNumber) => {
  actor.player.wounds = { ...actor.player.wounds, current, max };
};

const updateNpcHitPoints = (actor: WidgetNimbleGroupActorNpc, index: number, current: NimbleNumber) => {
  actor.npc.hitPool[index] = current;
};
</script>

<template>
  <div class="nimble-lab">
    <div class="nimble-lab__toolbar">
      <p>
        Widget view
      </p>
      <VaButtonToggle
        v-model="isOwner"
        :options="[
          { label: 'Owner', value: true },
          { label: 'Viewer', value: false },
        ]"
        border-color="primary"
        color="primary-dark"
      />
      <VaButton preset="outlined" icon="restart_alt" @click="group = createMockGroup()">
        Reset
      </VaButton>
    </div>

    <div class="nimble-lab__group-holder">
      <TableWidgetsNimbleGroupContent
        :actors="group.actors.filter(actor => isOwner || actor.enabled)"
        :is-owner="isOwner"
        @add-condition="(actorId, condition) => addCondition(group.actors.find(actor => actor.id === actorId)!, condition)"
        @add-npc-hit-point="actorId => addHitPool(group.actors.find(actor => actor.id === actorId)!)"
        @edit-actor="editActor"
        @remove-actor="removeActor"
        @remove-condition="(actorId, condition) => removeCondition(group.actors.find(actor => actor.id === actorId)!, condition)"
        @toggle-actor="actorId => toggleActor(group.actors.find(actor => actor.id === actorId)!)"
        @update-npc-hit-points="updateNpcHitPoints"
        @update-player-hit-points="updatePlayerHitPoints"
        @update-player-wounds="updatePlayerWounds"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.nimble-lab {
  box-sizing: border-box;
  max-width: 42rem;
  background: var(--va-background-element);
  padding: 1rem;
}

.nimble-lab__group-holder {
  width: 262px;
}

.nimble-lab__toolbar,
.nimble-lab__heading,
.nimble-lab__stats,
.nimble-lab__conditions {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.nimble-lab__toolbar {
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.nimble-lab__actor {
  border-top: 1px solid var(--va-background-border);
  padding: 0.75rem 0;
}

.nimble-lab__actor--hidden {
  opacity: 0.5;
}

.nimble-lab__heading {
  position: relative;

  > div:nth-child(2) {
    display: flex;
    flex-direction: column;
  }

  small,
  .nimble-lab__stats,
  p {
    color: var(--va-secondary);
    font-size: 0.8rem;
  }
}

.nimble-lab__actions {
  margin-left: auto;
}

.nimble-lab__stats {
  color: var(--va-secondary);
  flex-wrap: wrap;
  font-size: 0.8rem;
  margin: 0.35rem 0 0 1.5rem;
}

.nimble-lab__stats button {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.nimble-lab__conditions :deep(.va-input-wrapper) {
  min-width: 9rem;
}

.nimble-lab p {
  margin: 0.5rem 0 0 1.5rem;
}
</style>
