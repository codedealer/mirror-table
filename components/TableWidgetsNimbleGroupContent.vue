<script setup lang="ts">
import type { WidgetNimbleGroupActor, WidgetNimbleGroupActorNpc, WidgetNimbleGroupActorPlayer } from '~/models/types';
import { hasCompleteNimbleResource, isNimbleValueSet, isWidgetNimbleGroupActorNpc } from '~/models/NimbleGroup';

const props = defineProps<{
  actors: WidgetNimbleGroupActor[];
  isOwner: boolean;
}>();

const emit = defineEmits<{
  addCondition: [actorId: string, condition: string];
  addNpcHitPoint: [actorId: string];
  editActor: [actorId: string];
  removeActor: [actorId: string];
  removeCondition: [actorId: string, condition: string];
  toggleActor: [actorId: string];
  updateNpcHitPoints: [actor: WidgetNimbleGroupActorNpc, index: number, current: number];
  updatePlayerHitPoints: [actor: WidgetNimbleGroupActorPlayer, current: number, max: number];
}>();

const conditionDraft = ref<Record<string, string>>({});
const conditionPopoverOpen = ref<Record<string, boolean>>({});
const hitPointDraft = ref<Record<string, { current: string; max: string; damage: string }>>({});
const hitPointPopoverOpen = ref<Record<string, boolean>>({});

const addCondition = (actorId: string) => {
  if (!props.isOwner)
    return;
  const value = conditionDraft.value[actorId]?.trim();
  if (value) {
    emit('addCondition', actorId, value);
    conditionDraft.value[actorId] = '';
    conditionPopoverOpen.value[actorId] = false;
  }
};

const openHitPointPopover = (key: string, current: number, max?: number) => {
  hitPointDraft.value[key] = { current: String(current), max: max === undefined ? '' : String(max), damage: '' };
  nextTick(() => {
    setTimeout(() => {
      const input = [...document.querySelectorAll<HTMLInputElement>('.nimble-row__hitpoint-damage-input input')]
        .find(element => element.getClientRects().length > 0);
      input?.focus();
      input?.select();
    }, 0);
  });
};

const updatePlayerHitPoints = (actor: WidgetNimbleGroupActorPlayer) => {
  if (!props.isOwner)
    return;
  const draft = hitPointDraft.value[actor.id];
  const damage = Number(draft?.damage || 0);
  emit('updatePlayerHitPoints', actor, Number(draft?.current || 0) - damage, Number(draft?.max || 0));
  hitPointPopoverOpen.value[actor.id] = false;
};

const updateNpcHitPoints = (actor: WidgetNimbleGroupActorNpc, index: number) => {
  if (!props.isOwner)
    return;
  const key = `${actor.id}-${index}`;
  const draft = hitPointDraft.value[key];
  const damage = Number(draft?.damage || 0);
  emit('updateNpcHitPoints', actor, index, Number(draft?.current || 0) - damage);
  hitPointPopoverOpen.value[key] = false;
};
</script>

<template>
  <va-card outlined :bordered="false" class="card-thin nimble-widget">
    <slot name="controls" />
    <va-card-content>
      <div v-if="!props.actors.length" class="text-secondary">
        No visible entries
      </div>
      <article v-for="actor in props.actors" :key="actor.id" class="nimble-row" :class="{ 'nimble-row--hidden': !actor.enabled }">
        <div class="nimble-row__heading">
          <TableWidgetsNimbleGroupAvatar v-if="actor.avatar" :preview="actor.avatar" :title="actor.name" />
          <va-icon v-else :name="isWidgetNimbleGroupActorNpc(actor) ? 'smart_toy' : 'person'" :aria-label="`No avatar for ${actor.name}`" />
          <div class="nimble-row__heading-text">
            <strong v-if="isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__npc-name" :class="props.isOwner ? `nimble-row__npc-name--${actor.npc.subtype}` : undefined" :title="props.isOwner ? actor.npc.subtype : undefined">{{ actor.name }}</strong>
            <strong v-else>{{ actor.name }}</strong>
            <small v-if="actor.role">{{ actor.role }}</small>
            <div v-if="isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__player-stats">
              <span v-if="actor.npc.armor" title="Armor"><va-icon name="shield" aria-hidden="true" />{{ actor.npc.armor === 'medium' ? 'M' : 'H' }}</span>
              <span v-if="isNimbleValueSet(actor.npc.speed)" title="Speed"><va-icon name="directions_run" aria-hidden="true" />{{ actor.npc.speed }}</span>
            </div>
            <div v-else class="nimble-row__player-stats">
              <va-popover v-if="hasCompleteNimbleResource(actor.player.hitPoints.current, actor.player.hitPoints.max)" v-model="hitPointPopoverOpen[actor.id]" trigger="click" :close-on-content-click="false" placement="bottom-start" content-class="nimble-row__hitpoint-popover">
                <button type="button" class="nimble-row__hitpoint-value" title="Edit hit points" @click="openHitPointPopover(actor.id, Number(actor.player.hitPoints.current), Number(actor.player.hitPoints.max))">
                  <va-icon name="favorite" aria-hidden="true" />{{ actor.player.hitPoints.current }}/{{ actor.player.hitPoints.max }}<template v-if="actor.player.hitPoints.temp">
                    +{{ actor.player.hitPoints.temp }}
                  </template>
                </button>
                <template #body>
                  <va-input v-model="hitPointDraft[actor.id].current" class="nimble-row__hitpoint-input" type="number" label="Current" hide-details @keydown.enter.prevent.stop="updatePlayerHitPoints(actor)" />
                  <va-input v-model="hitPointDraft[actor.id].max" class="nimble-row__hitpoint-input" type="number" label="Max" hide-details @keydown.enter.prevent.stop="updatePlayerHitPoints(actor)" />
                  <va-input v-model="hitPointDraft[actor.id].damage" class="nimble-row__hitpoint-input nimble-row__hitpoint-damage-input" type="number" label="Damage" hide-details @keydown.enter.prevent.stop="updatePlayerHitPoints(actor)" />
                </template>
              </va-popover>
              <span v-if="isNimbleValueSet(actor.player.armor)" title="Armor"><va-icon name="shield" aria-hidden="true" />{{ actor.player.armor }}</span>
              <span v-if="isNimbleValueSet(actor.player.speed)" title="Speed"><va-icon name="directions_run" aria-hidden="true" />{{ actor.player.speed }}</span>
            </div>
          </div>
          <div v-if="props.isOwner" class="nimble-row__controls">
            <va-popover v-model="conditionPopoverOpen[actor.id]" trigger="click" placement="bottom-end" content-class="nimble-row__condition-popover">
              <va-button size="small" preset="plain" icon="add" :aria-label="`Add condition to ${actor.name}`" title="Add condition" />
              <template #body>
                <va-input v-model="conditionDraft[actor.id]" placeholder="Condition" hide-details autofocus @keyup.enter="addCondition(actor.id)" /><va-button size="small" round icon="check" aria-label="Add condition" @click="addCondition(actor.id)" />
              </template>
            </va-popover>
            <va-button preset="plain" icon="edit" :aria-label="`Edit ${actor.name}`" title="Edit actor" @click="emit('editActor', actor.id)" />
            <va-button preset="plain" size="small" :icon="actor.enabled ? 'visibility' : 'visibility_off'" :aria-label="`Toggle ${actor.name}`" :title="actor.enabled ? `Hide ${actor.name}` : `Show ${actor.name}`" @click="emit('toggleActor', actor.id)" />
            <va-button preset="plain" icon="close" :aria-label="`Remove ${actor.name}`" title="Remove actor" @click="emit('removeActor', actor.id)" />
          </div>
        </div>
        <div v-if="props.isOwner && isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__stats">
          <button type="button" class="nimble-row__hitpool-add" aria-label="Add hit point" title="Add hit point" @click="emit('addNpcHitPoint', actor.id)">
            +
          </button>
          <div v-if="actor.npc.hitPool.length" class="nimble-row__hitpool">
            <va-popover v-for="(hitPoints, index) in actor.npc.hitPool" :key="index" v-model="hitPointPopoverOpen[`${actor.id}-${index}`]" trigger="click" :close-on-content-click="false" placement="bottom-start" content-class="nimble-row__hitpoint-popover">
              <button type="button" class="nimble-row__hitpoint-value" title="Edit hit points" @click="openHitPointPopover(`${actor.id}-${index}`, hitPoints)">
                HP {{ hitPoints }}
              </button><template #body>
                <va-input v-model="hitPointDraft[`${actor.id}-${index}`].current" class="nimble-row__hitpoint-input" type="number" label="Hitpoints" hide-details @keydown.enter.prevent.stop="updateNpcHitPoints(actor, index)" /><va-input v-model="hitPointDraft[`${actor.id}-${index}`].damage" class="nimble-row__hitpoint-input nimble-row__hitpoint-damage-input" type="number" label="Damage" hide-details @keydown.enter.prevent.stop="updateNpcHitPoints(actor, index)" />
              </template>
            </va-popover>
          </div>
        </div>
        <div v-else-if="!isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__stats">
          <span v-if="hasCompleteNimbleResource(actor.player.wounds.current, actor.player.wounds.max)">Wounds {{ actor.player.wounds.current }}/{{ actor.player.wounds.max }}</span>
        </div>
        <div v-if="actor.conditions.length" class="nimble-row__conditions">
          <va-button v-for="condition in actor.conditions" :key="condition" size="small" round color="warning" :disabled="!props.isOwner" :aria-label="`${props.isOwner ? 'Remove' : 'Condition'} ${condition} ${props.isOwner ? `from ${actor.name}` : ''}`" @click="emit('removeCondition', actor.id, condition)">
            {{ condition }}
          </va-button>
        </div>
        <MarkdownRenderer v-if="actor.content" :source="actor.content" />
        <div v-if="props.isOwner && actor.privateContent" class="nimble-row__private-content">
          <MarkdownRenderer :source="actor.privateContent" />
        </div>
      </article>
    </va-card-content>
  </va-card>
</template>

<style lang="scss">
.nimble-row {
  border-top: 1px solid var(--va-background-border);
  padding: 0.45rem 0;
  position: relative;
}
.nimble-row:first-of-type {
  border-top: 0;
}
.nimble-row--hidden {
  opacity: 0.5;
}
.nimble-row__heading,
.nimble-row__stats {
  align-items: center;
  display: flex;
  gap: 0.35rem;
}
.nimble-row__heading-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.nimble-row__heading-text strong {
  font-size: 1rem;
  font-weight: 500;
}
.nimble-row__npc-name--minion {
  color: var(--va-danger);
}
.nimble-row__npc-name--flunky {
  color: var(--va-info);
}
.nimble-row__npc-name--legendary {
  background: linear-gradient(90deg, #a66a00, #f5d06f, #a66a00);
  background-clip: text;
  color: transparent;
}
.nimble-row__player-stats {
  align-items: center;
  color: var(--va-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.75rem;
  gap: 0.45rem;
}
.nimble-row__player-stats span {
  align-items: center;
  display: inline-flex;
  gap: 0.1rem;
}
.nimble-row__player-stats .va-icon {
  font-size: 0.9rem;
}
.nimble-row__heading small {
  color: var(--va-secondary);
  flex: 1;
}
.nimble-row__controls {
  align-items: center;
  background: var(--va-background-element);
  display: flex;
  gap: 0.1rem;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
  transition: opacity 120ms ease;
}
.nimble-row:hover .nimble-row__controls,
.nimble-row:focus-within .nimble-row__controls {
  opacity: 1;
  pointer-events: auto;
}
.nimble-row__stats {
  color: var(--va-secondary);
  font-size: 0.75rem;
  justify-content: space-between;
}
.nimble-row__hitpool {
  display: flex;
  flex: 1;
  gap: 0.2rem;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.nimble-row__hitpool-add,
.nimble-row__hitpoint-value {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
}
.nimble-row__hitpool-add {
  color: var(--va-primary);
  flex: 0 0 auto;
  font-size: 1rem;
  line-height: 1;
}
.nimble-row__hitpoint-value {
  align-items: center;
  display: inline-flex;
  gap: 0.1rem;
  white-space: nowrap;
}
.nimble-row__hitpoint-input {
  width: 4.5rem;
}
.nimble-row__hitpoint-popover {
  align-items: flex-end;
  display: flex;
  gap: 0.35rem;
  padding: 0.5rem;
}
.nimble-row__conditions {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.2rem;
  margin-top: 0.25rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  scrollbar-width: thin;
}
.nimble-row__conditions > .va-button {
  flex: 0 0 auto;
}
.nimble-row__condition-popover {
  align-items: center;
  display: flex;
  gap: 0.35rem;
  padding: 0.5rem;
}
.nimble-row__private-content {
  background: color-mix(in srgb, var(--va-background-element) 75%, var(--va-background-primary));
  border-left: 3px solid var(--va-warning);
  font-size: 11px;
  margin-top: 0.5rem;
  padding: 0.35rem 0.6rem;
}
</style>
