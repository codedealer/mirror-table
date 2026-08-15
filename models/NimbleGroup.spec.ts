import type { NimbleHitPoints } from '~/models/types';
import { describe, expect, it } from 'vitest';
import {
  applyNimbleDamage,
  hasCompleteNimbleResource,
  isNimbleNumber,
  isNimbleValueSet,
  isWidgetNimbleGroup,
  isWidgetNimbleGroupActorNpc,
  isWidgetNimbleGroupActorPlayer,
  normalizeNimbleActorRanks,
  normalizeNimbleConditions,
  WidgetNimbleGroupActorNpcFactory,
  WidgetNimbleGroupActorPlayerFactory,
  WidgetNimbleGroupFactory,
} from '~/models/NimbleGroup';

describe('nimble group helpers', () => {
  it('creates safe player and NPC defaults', () => {
    expect(WidgetNimbleGroupActorPlayerFactory().enabled).toBe(false);
    expect(WidgetNimbleGroupActorPlayerFactory().player.hitPool).toEqual([{ current: '', max: '', temp: '' }]);
    expect(WidgetNimbleGroupActorNpcFactory().npc.hitPool).toEqual([]);
  });

  it('validates NPC discriminants', () => {
    expect(isWidgetNimbleGroupActorNpc(WidgetNimbleGroupActorNpcFactory())).toBe(true);
    expect(isWidgetNimbleGroupActorNpc({ ...WidgetNimbleGroupActorNpcFactory(), npc: { ...WidgetNimbleGroupActorNpcFactory().npc, armor: 'invalid' } })).toBe(false);
  });

  it('requires ordered string conditions for both actor types', () => {
    const player = WidgetNimbleGroupActorPlayerFactory();
    const npc = WidgetNimbleGroupActorNpcFactory();

    player.conditions = { Stunned: true } as never;
    npc.conditions = ['Stunned', 2] as never;

    expect(isWidgetNimbleGroupActorPlayer(player)).toBe(false);
    expect(isWidgetNimbleGroupActorNpc(npc)).toBe(false);
  });

  it('rejects groups containing legacy object-map conditions', () => {
    const group = WidgetNimbleGroupFactory('file');
    const actor = WidgetNimbleGroupActorPlayerFactory('actor');
    actor.conditions = { Stunned: true } as never;
    group.actors = [actor];

    expect(isWidgetNimbleGroup(group)).toBe(false);
  });

  it('validates nested player and NPC Nimble numbers', () => {
    const player = WidgetNimbleGroupActorPlayerFactory();
    const npc = WidgetNimbleGroupActorNpcFactory();

    player.player.stats.wil = 'invalid' as never;
    npc.npc.stats.dex = null as never;

    expect(isWidgetNimbleGroupActorPlayer(player)).toBe(false);
    expect(isWidgetNimbleGroupActorNpc(npc)).toBe(false);
    expect(isNimbleNumber(Number.NaN)).toBe(false);
    expect(isNimbleNumber(Infinity)).toBe(false);
  });

  it('rejects actors with missing discriminant payloads', () => {
    const player = WidgetNimbleGroupActorPlayerFactory();
    const npc = WidgetNimbleGroupActorNpcFactory();

    delete (player as { player?: unknown }).player;
    delete (npc as { npc?: unknown }).npc;

    expect(isWidgetNimbleGroupActorPlayer(player)).toBe(false);
    expect(isWidgetNimbleGroupActorNpc(npc)).toBe(false);
    expect(isWidgetNimbleGroup({ ...WidgetNimbleGroupFactory('file'), actors: [player] })).toBe(false);
  });

  it('rejects actors with malformed base fields before rendering or sorting', () => {
    const player = WidgetNimbleGroupActorPlayerFactory('player');
    const npc = WidgetNimbleGroupActorNpcFactory('npc');

    player.id = undefined as never;
    npc.rank = Number.NaN;

    expect(isWidgetNimbleGroupActorPlayer(player)).toBe(false);
    expect(isWidgetNimbleGroupActorNpc(npc)).toBe(false);
  });

  it('accepts empty Nimble numbers in player and NPC numeric fields', () => {
    const player = WidgetNimbleGroupActorPlayerFactory();
    const npc = WidgetNimbleGroupActorNpcFactory();
    player.player.stats = { wil: '', str: '', dex: '', int: '' };
    player.player.armor = '';
    player.player.hitPool = [{ current: '', max: '', temp: '' }];
    player.player.wounds = { current: '', max: '' };
    npc.npc.stats = { wil: '', str: '', dex: '', int: '' };

    expect(isWidgetNimbleGroupActorPlayer(player)).toBe(true);
    expect(isWidgetNimbleGroupActorNpc(npc)).toBe(true);
  });

  it('trims conditions, removes blanks, and removes duplicates in order', () => {
    expect(normalizeNimbleConditions([' Stunned ', 'Hidden', '', 'Stunned', ' Hidden '])).toEqual(['Stunned', 'Hidden']);
  });

  it('uses the ordered condition array when an actor is edited', () => {
    const actor = WidgetNimbleGroupActorPlayerFactory('actor');
    actor.conditions = ['Stunned', 'Poisoned'];

    const editedActor = { ...actor, name: 'Updated actor' };

    expect(editedActor.conditions).toEqual(['Stunned', 'Poisoned']);
  });

  it('shows resources when either value is set, including zero', () => {
    expect(hasCompleteNimbleResource(5, 0)).toBe(true);
    expect(hasCompleteNimbleResource(5, '')).toBe(true);
    expect(hasCompleteNimbleResource(0, 5)).toBe(true);
    expect(hasCompleteNimbleResource('', 0)).toBe(true);
    expect(hasCompleteNimbleResource('', '')).toBe(false);
  });

  it('applies damage to temporary hit points before current hit points', () => {
    expect(applyNimbleDamage({ current: 10, max: 10, temp: 3 }, 5)).toEqual({ current: 8, max: 10, temp: 0 });
    expect(applyNimbleDamage({ current: 10, max: 10, temp: 3 }, 2)).toEqual({ current: 10, max: 10, temp: 1 });
    expect(applyNimbleDamage({ current: 10, max: 10, temp: '' }, 5)).toEqual({ current: 5, max: 10, temp: '' });
  });

  it('leaves hit points unchanged for zero, negative, and empty damage input', () => {
    const hitPoints: NimbleHitPoints = { current: 10, max: '', temp: 3 };

    expect(applyNimbleDamage(hitPoints, 0)).toEqual(hitPoints);
    expect(applyNimbleDamage(hitPoints, -2)).toEqual(hitPoints);
    expect(applyNimbleDamage(hitPoints, Number(''))).toEqual(hitPoints);
  });

  it('preserves empty current and max values while consuming temporary hit points', () => {
    expect(applyNimbleDamage({ current: '', max: '', temp: 3 }, 2)).toEqual({ current: '', max: '', temp: 1 });
    expect(applyNimbleDamage({ current: '', max: '', temp: 3 }, 5)).toEqual({ current: '', max: '', temp: 0 });
  });

  it('applies the same damage order to player and NPC hitpoint entries', () => {
    const player = WidgetNimbleGroupActorPlayerFactory('player');
    const npc = WidgetNimbleGroupActorNpcFactory('npc');
    player.player.hitPool[0] = { current: 10, max: 12, temp: 4 };
    npc.npc.hitPool = [{ current: 10, max: 12, temp: 4 }];

    expect(applyNimbleDamage(player.player.hitPool[0], 6)).toEqual({ current: 8, max: 12, temp: 0 });
    expect(applyNimbleDamage(npc.npc.hitPool[0], 6)).toEqual({ current: 8, max: 12, temp: 0 });
  });

  it('treats numeric zero as a set value', () => {
    expect(isNimbleValueSet(0)).toBe(true);
    expect(isNimbleValueSet('')).toBe(false);
    expect(isNimbleValueSet(null)).toBe(false);
    expect(isNimbleValueSet(undefined)).toBe(false);
  });

  it('normalizes ranks without merging NPC hit pools', () => {
    const npc = WidgetNimbleGroupActorNpcFactory('npc', 9);
    npc.npc.hitPool = [{ current: 4, max: '', temp: '' }, { current: 7, max: '', temp: '' }];
    const player = WidgetNimbleGroupActorPlayerFactory('player', 2);
    const normalized = normalizeNimbleActorRanks([npc, player]);
    expect(normalized.map(actor => actor.rank)).toEqual([0, 1]);
    const normalizedNpc = normalized.find(actor => actor.type === 'npc');
    expect(normalizedNpc?.type === 'npc' && normalizedNpc.npc.hitPool).toEqual([{ current: 4, max: '', temp: '' }, { current: 7, max: '', temp: '' }]);
  });

  it('preserves the requested order while normalizing ranks', () => {
    const first = WidgetNimbleGroupActorPlayerFactory('first', 0);
    const second = WidgetNimbleGroupActorPlayerFactory('second', 1);

    const normalized = normalizeNimbleActorRanks([second, first]);

    expect(normalized.map(actor => actor.id)).toEqual(['second', 'first']);
    expect(normalized.map(actor => actor.rank)).toEqual([0, 1]);
  });
});
