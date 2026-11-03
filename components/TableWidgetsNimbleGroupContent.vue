<script setup lang="ts">
import type { NimbleHitPoints, NimbleNumber, WidgetNimbleGroupActor, WidgetNimbleGroupActorNpc, WidgetNimbleGroupActorPlayer } from '~/models/types';
import { applyNimbleDamage, hasCompleteNimbleResource, isNimbleValueSet, isWidgetNimbleGroupActorNpc, isWidgetNimbleGroupActorPlayer } from '~/models/NimbleGroup';

const props = defineProps<{
  actors: WidgetNimbleGroupActor[];
  isOwner: boolean;
  avatarSrcs?: Record<string, string>;
}>();

const emit = defineEmits<{
  addCondition: [actorId: string, condition: string];
  addNpcHitPoint: [actorId: string];
  editActor: [actorId: string];
  removeActor: [actorId: string];
  removeCondition: [actorId: string, condition: string];
  toggleActor: [actorId: string];
  updateHitPoints: [actor: WidgetNimbleGroupActorNpc | WidgetNimbleGroupActorPlayer, index: number, hitPoints: NimbleHitPoints];
  updatePlayerWounds: [actor: WidgetNimbleGroupActorPlayer, current: NimbleNumber, max: NimbleNumber];
}>();

const conditionDraft = ref<Record<string, string>>({});
const conditionPopoverOpen = ref<Record<string, boolean>>({});
const hitPointDraft = ref<Record<string, { current: string; max: string; temp: string; damage: string }>>({});
const hitPointPopoverOpen = ref<Record<string, boolean>>({});
const widgetContentCollapsed = ref(false);
const actorContentExpanded = ref<Record<string, boolean>>({});

const isActorContentCollapsed = (actorId: string) => widgetContentCollapsed.value
  ? actorContentExpanded.value[actorId] !== true
  : actorContentExpanded.value[actorId] === false;

const toggleWidgetContent = () => {
  widgetContentCollapsed.value = !widgetContentCollapsed.value;
  actorContentExpanded.value = {};
};

const toggleActorContent = (actorId: string) => {
  actorContentExpanded.value[actorId] = isActorContentCollapsed(actorId);
};

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

const openHitPointPopover = (key: string, hitPoints: NimbleHitPoints) => {
  hitPointDraft.value[key] = { current: String(hitPoints.current), max: String(hitPoints.max), temp: String(hitPoints.temp), damage: '' };
  nextTick(() => {
    setTimeout(() => {
      const input = [...document.querySelectorAll<HTMLInputElement>('.nimble-row__hitpoint-damage-input input')]
        .find(element => element.getClientRects().length > 0);
      input?.focus();
      input?.select();
    }, 0);
  });
};

const updateHitPoints = (actor: WidgetNimbleGroupActorNpc | WidgetNimbleGroupActorPlayer, index: number) => {
  if (!props.isOwner)
    return;
  const key = `${actor.id}-${index}`;
  const draft = hitPointDraft.value[key];
  const damage = Number(draft?.damage || 0);
  const hitPoints = applyNimbleDamage({
    current: draft?.current === '' ? '' : Number(draft?.current || 0),
    max: draft?.max === '' ? '' : Number(draft?.max || 0),
    temp: draft?.temp === '' ? '' : Number(draft?.temp || 0),
  }, damage);
  if (draft) {
    draft.current = String(hitPoints.current);
    draft.temp = String(hitPoints.temp);
    draft.damage = '';
  }
  emit('updateHitPoints', actor, index, hitPoints);
  hitPointPopoverOpen.value[key] = false;
};

const updatePlayerWounds = (actor: WidgetNimbleGroupActorPlayer) => {
  if (!props.isOwner)
    return;
  const key = `wounds-${actor.id}`;
  const draft = hitPointDraft.value[key];
  const current = draft?.current === '' ? '' : Number(draft?.current || 0);
  const max = draft?.max === '' ? '' : Number(draft?.max || 0);
  emit('updatePlayerWounds', actor, current, max);
  hitPointPopoverOpen.value[key] = false;
};
</script>

<template>
  <va-card outlined :bordered="false" class="card-thin nimble-widget">
    <slot name="controls" :widget-content-collapsed="widgetContentCollapsed" :toggle-widget-content="toggleWidgetContent" />
    <va-card-content>
      <div v-if="!props.actors.length" class="text-secondary">
        No visible entries
      </div>
      <article v-for="actor in props.actors" :key="actor.id" class="nimble-row" :class="{ 'nimble-row--hidden': !actor.enabled }">
        <div class="nimble-row__heading">
          <va-badge v-if="isWidgetNimbleGroupActorNpc(actor) && actor.npc.hitPool.length > 1" :text="String(actor.npc.hitPool.length)" class="nimble-row__qty-badge" color="primary-dark" overlap>
            <TableWidgetsNimbleGroupAvatar :preview="actor.avatar" :title="actor.name" :subtype="isWidgetNimbleGroupActorNpc(actor) ? actor.npc.subtype : undefined" :fallback-icon="isWidgetNimbleGroupActorNpc(actor) ? 'smart_toy' : 'person'" :src="props.avatarSrcs?.[actor.id]" />
          </va-badge>
          <TableWidgetsNimbleGroupAvatar v-else :preview="actor.avatar" :title="actor.name" :subtype="isWidgetNimbleGroupActorNpc(actor) ? actor.npc.subtype : undefined" :fallback-icon="isWidgetNimbleGroupActorNpc(actor) ? 'smart_toy' : 'person'" :src="props.avatarSrcs?.[actor.id]" />
          <div class="nimble-row__heading-text">
            <strong v-if="isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__npc-name" :class="`nimble-row__npc-name--${actor.npc.subtype}`" :title="actor.npc.subtype">{{ actor.name }}</strong>
            <strong v-else>{{ actor.name }}</strong>
            <small v-if="actor.role">{{ actor.role }}</small>
            <div v-if="isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__player-stats">
              <span v-if="actor.npc.armor" :class="{ 'nimble-row__stat--warning': actor.npc.armor === 'heavy' }" title="Armor"><va-icon name="shield" aria-hidden="true" /><span class="text-primary">{{ actor.npc.armor === 'medium' ? 'M' : 'H' }}</span></span>
              <span v-if="isNimbleValueSet(actor.npc.speed)" title="Speed"><va-icon name="directions_run" aria-hidden="true" /><span class="text-primary">{{ actor.npc.speed }}</span></span>
              <div v-if="props.isOwner" class="ghost-container">
                <span v-if="isNimbleValueSet(actor.npc.stats.wil)" title="Will"><span class="text-secondary">Wil</span> <span class="text-primary">{{ actor.npc.stats.wil }}</span></span>
                <span v-if="isNimbleValueSet(actor.npc.stats.str)" title="Strength"><span class="text-secondary">Str</span> <span class="text-primary">{{ actor.npc.stats.str }}</span></span>
                <span v-if="isNimbleValueSet(actor.npc.stats.dex)" title="Dexterity"><span class="text-secondary">Dex</span> <span class="text-primary">{{ actor.npc.stats.dex }}</span></span>
                <span v-if="isNimbleValueSet(actor.npc.stats.int)" title="Intelligence"><span class="text-secondary">Int</span> <span class="text-primary">{{ actor.npc.stats.int }}</span></span>
              </div>
            </div>
            <div v-if="isWidgetNimbleGroupActorPlayer(actor)" class="nimble-row__player-resources">
              <va-popover v-if="hasCompleteNimbleResource(actor.player.hitPool[0].current, actor.player.hitPool[0].max)" v-model="hitPointPopoverOpen[actor.id]" trigger="click" :close-on-content-click="false" placement="bottom-start" content-class="nimble-row__hitpoint-popover">
                <button type="button" class="nimble-row__hitpoint-value" title="Edit hit points" @click="openHitPointPopover(`${actor.id}-0`, actor.player.hitPool[0])">
                  <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
                  <va-icon name="favorite" color="primary-dark" aria-hidden="true" />{{ actor.player.hitPool[0].current }}<template v-if="isNimbleValueSet(actor.player.hitPool[0].max)">/{{ actor.player.hitPool[0].max }}</template><template v-if="actor.player.hitPool[0].temp"><span class="nimble-row__hitpoint-temp">+{{ actor.player.hitPool[0].temp }}</span></template>
                </button>
                <template #body>
                  <va-input v-model="hitPointDraft[`${actor.id}-0`].current" class="nimble-row__hitpoint-input" type="number" label="Current" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, 0)" />
                  <va-input v-model="hitPointDraft[`${actor.id}-0`].max" class="nimble-row__hitpoint-input" type="number" label="Max" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, 0)" />
                  <va-input v-model="hitPointDraft[`${actor.id}-0`].temp" class="nimble-row__hitpoint-input" type="number" label="Temp" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, 0)" />
                  <va-input v-model="hitPointDraft[`${actor.id}-0`].damage" class="nimble-row__hitpoint-input nimble-row__hitpoint-damage-input" type="number" label="Damage" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, 0)" />
                </template>
              </va-popover>
              <span v-if="isNimbleValueSet(actor.player.armor)" title="Armor"><va-icon name="shield" aria-hidden="true" />{{ actor.player.armor }}</span>
              <span v-if="isNimbleValueSet(actor.player.speed)" title="Speed"><va-icon name="directions_run" aria-hidden="true" />{{ actor.player.speed }}</span>
              <va-popover v-if="hasCompleteNimbleResource(actor.player.wounds.current, actor.player.wounds.max)" v-model="hitPointPopoverOpen[`wounds-${actor.id}`]" trigger="click" :close-on-content-click="false" placement="bottom-start" content-class="nimble-row__hitpoint-popover">
                <button type="button" class="nimble-row__hitpoint-value" title="Edit wounds" @click="openHitPointPopover(`wounds-${actor.id}`, { ...actor.player.wounds, temp: '' })">
                  <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
                  <va-icon name="healing" color="danger-dark" aria-hidden="true" />{{ actor.player.wounds.current }}<template v-if="isNimbleValueSet(actor.player.wounds.max)">/{{ actor.player.wounds.max }}</template>
                </button>
                <template #body>
                  <va-input v-model="hitPointDraft[`wounds-${actor.id}`].current" class="nimble-row__hitpoint-input" type="number" label="Current" hide-details @keydown.enter.prevent.stop="updatePlayerWounds(actor)" />
                  <va-input v-model="hitPointDraft[`wounds-${actor.id}`].max" class="nimble-row__hitpoint-input" type="number" label="Max" hide-details @keydown.enter.prevent.stop="updatePlayerWounds(actor)" />
                </template>
              </va-popover>
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
            <va-button preset="plain" size="small" :icon="isActorContentCollapsed(actor.id) ? 'unfold_more' : 'unfold_less'" :aria-label="isActorContentCollapsed(actor.id) ? `Expand content for ${actor.name}` : `Collapse content for ${actor.name}`" :title="isActorContentCollapsed(actor.id) ? 'Expand content' : 'Collapse content'" @click="toggleActorContent(actor.id)" />
            <va-button preset="plain" icon="close" :aria-label="`Remove ${actor.name}`" title="Remove actor" @click="emit('removeActor', actor.id)" />
          </div>
        </div>
        <div v-if="!isWidgetNimbleGroupActorNpc(actor) && (isNimbleValueSet(actor.player.stats.wil) || isNimbleValueSet(actor.player.stats.str) || isNimbleValueSet(actor.player.stats.dex) || isNimbleValueSet(actor.player.stats.int))" class="nimble-row__player-stats nimble-row__player-stats--separate">
          <span v-if="isNimbleValueSet(actor.player.stats.wil)" title="Will"><span class="text-secondary">Wil</span> <span class="text-primary">{{ actor.player.stats.wil }}</span></span>
          <span v-if="isNimbleValueSet(actor.player.stats.str)" title="Strength"><span class="text-secondary">Str</span> <span class="text-primary">{{ actor.player.stats.str }}</span></span>
          <span v-if="isNimbleValueSet(actor.player.stats.dex)" title="Dexterity"><span class="text-secondary">Dex</span> <span class="text-primary">{{ actor.player.stats.dex }}</span></span>
          <span v-if="isNimbleValueSet(actor.player.stats.int)" title="Intelligence"><span class="text-secondary">Int</span> <span class="text-primary">{{ actor.player.stats.int }}</span></span>
        </div>
        <div v-if="props.isOwner && isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__stats">
          <button type="button" class="nimble-row__hitpool-add" aria-label="Add hit point" title="Add hit point" @click="emit('addNpcHitPoint', actor.id)">
            +
          </button>
          <div v-if="actor.npc.hitPool.length" class="nimble-row__hitpool">
            <template v-for="(hitPoints, index) in actor.npc.hitPool" :key="index">
              <va-popover v-if="isNimbleValueSet(hitPoints.current)" v-model="hitPointPopoverOpen[`${actor.id}-${index}`]" trigger="click" :close-on-content-click="false" placement="bottom-start" content-class="nimble-row__hitpoint-popover">
                <button type="button" class="nimble-row__hitpoint-value" title="Edit hit points" @click="openHitPointPopover(`${actor.id}-${index}`, hitPoints)">
                  <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
                  <va-icon name="favorite" color="primary-dark" aria-hidden="true" />{{ hitPoints.current }}<template v-if="isNimbleValueSet(hitPoints.max)">/{{ hitPoints.max }}</template><template v-if="hitPoints.temp"><span class="nimble-row__hitpoint-temp">+{{ hitPoints.temp }}</span></template>
                </button><template #body>
                  <va-input v-model="hitPointDraft[`${actor.id}-${index}`].current" class="nimble-row__hitpoint-input" type="number" label="Current" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, index)" /><va-input v-model="hitPointDraft[`${actor.id}-${index}`].max" class="nimble-row__hitpoint-input" type="number" label="Max" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, index)" /><va-input v-model="hitPointDraft[`${actor.id}-${index}`].temp" class="nimble-row__hitpoint-input" type="number" label="Temp" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, index)" /><va-input v-model="hitPointDraft[`${actor.id}-${index}`].damage" class="nimble-row__hitpoint-input nimble-row__hitpoint-damage-input" type="number" label="Damage" hide-details @keydown.enter.prevent.stop="updateHitPoints(actor, index)" />
                </template>
              </va-popover>
            </template>
          </div>
        </div>
        <div v-if="actor.conditions.length" class="nimble-row__conditions">
          <va-button v-for="condition in actor.conditions" :key="condition" class="nimble-row__condition" size="small" round color="warning" :disabled="!props.isOwner" :aria-label="`${props.isOwner ? 'Remove' : 'Condition'} ${condition} ${props.isOwner ? `from ${actor.name}` : ''}`" @click="emit('removeCondition', actor.id, condition)">
            {{ condition }}
          </va-button>
        </div>
        <div
          v-if="actor.content"
          class="nimble-row__content"
          :class="{ 'nimble-row__content--collapsed': isActorContentCollapsed(actor.id) }"
          :role="isActorContentCollapsed(actor.id) ? 'button' : undefined"
          :tabindex="isActorContentCollapsed(actor.id) ? 0 : undefined"
          :aria-label="isActorContentCollapsed(actor.id) ? 'Expand actor content' : undefined"
          :aria-expanded="!isActorContentCollapsed(actor.id)"
          @click="isActorContentCollapsed(actor.id) && toggleActorContent(actor.id)"
          @keydown.enter.prevent="isActorContentCollapsed(actor.id) && toggleActorContent(actor.id)"
          @keydown.space.prevent="isActorContentCollapsed(actor.id) && toggleActorContent(actor.id)"
        >
          <MarkdownRenderer :source="actor.content" />
        </div>
        <div
          v-if="props.isOwner && actor.privateContent"
          class="nimble-row__content nimble-row__private-content"
          :class="{ 'nimble-row__content--collapsed': isActorContentCollapsed(actor.id) }"
          :role="isActorContentCollapsed(actor.id) ? 'button' : undefined"
          :tabindex="isActorContentCollapsed(actor.id) ? 0 : undefined"
          :aria-label="isActorContentCollapsed(actor.id) ? 'Expand private actor content' : undefined"
          :aria-expanded="!isActorContentCollapsed(actor.id)"
          @click="isActorContentCollapsed(actor.id) && toggleActorContent(actor.id)"
          @keydown.enter.prevent="isActorContentCollapsed(actor.id) && toggleActorContent(actor.id)"
          @keydown.space.prevent="isActorContentCollapsed(actor.id) && toggleActorContent(actor.id)"
        >
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

  /* make markdown content more compact */
  .window-container-markdown-renderer > div > * {
    margin-bottom: 0.25rem;
  }
  .window-container-markdown-renderer > div > ul {
    margin-left: 1rem;
  }
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
.text-primary {
  color: var(--va-text-primary);
}
.nimble-row__qty-badge {
  --va-badge-text-wrapper-border-radius: 50%;
}
.nimble-row__heading > .va-badge {
  flex: 0 0 auto;
}
.nimble-row__content {
  border-left: 3px solid var(--va-background-border);
  margin-top: 0.5rem;
  outline: none;
  padding: 0 0.6rem;
  position: relative;
}
.nimble-row__content--collapsed {
  cursor: pointer;
  max-height: 1.75rem;
  overflow: hidden;
}
.nimble-row__content--collapsed:hover,
.nimble-row__content--collapsed:focus {
  max-height: 12rem;
  overflow-y: auto;
}
.nimble-row__content--collapsed::after {
  background: var(--va-background-element);
  border: 1px solid var(--va-background-border);
  border-radius: 2px;
  color: var(--va-secondary);
  content: 'more';
  bottom: 0;
  font-size: 0.65rem;
  line-height: 1;
  padding: 0.1rem 0.2rem;
  pointer-events: none;
  position: absolute;
  right: 0.2rem;
}
.nimble-row__content--collapsed:hover::after,
.nimble-row__content--collapsed:focus::after {
  display: none;
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
  font-size: 0.9rem;
  gap: 0.25rem;
}
.nimble-row__player-stats span {
  align-items: center;
  display: inline-flex;
  gap: 0.1rem;
}
.nimble-row__player-stats--separate {
  margin-top: 0.25rem;
}
.nimble-row__stat--warning {
  color: var(--va-warning);
}
.nimble-row__player-resources {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.nimble-row__player-resources .va-icon {
  font-size: 0.9rem;
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
  gap: 2px;
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
  padding: 0.1rem 0;
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
.nimble-row__hitpoint-temp {
  color: var(--va-warning);
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
.nimble-row__condition:disabled {
  color: var(--va-background-primary) !important;
  opacity: 1;
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
}
</style>
