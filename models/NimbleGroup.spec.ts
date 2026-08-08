import { describe, expect, it } from 'vitest';
import {
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
    expect(WidgetNimbleGroupActorPlayerFactory().player.hitPoints).toEqual({ current: 0, max: 0, temp: 0 });
    expect(WidgetNimbleGroupActorNpcFactory().npc.hitPool).toEqual([0]);
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
    player.player.hitPoints = { current: '', max: '', temp: '' };
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

  it('omits incomplete resources while allowing zero current values', () => {
    expect(hasCompleteNimbleResource(5, 0)).toBe(false);
    expect(hasCompleteNimbleResource(0, 5)).toBe(true);
    expect(hasCompleteNimbleResource('', 5)).toBe(false);
  });

  it('treats numeric zero as a set value', () => {
    expect(isNimbleValueSet(0)).toBe(true);
    expect(isNimbleValueSet('')).toBe(false);
    expect(isNimbleValueSet(null)).toBe(false);
    expect(isNimbleValueSet(undefined)).toBe(false);
  });

  it('normalizes ranks without merging NPC hit pools', () => {
    const npc = WidgetNimbleGroupActorNpcFactory('npc', 9);
    npc.npc.hitPool = [4, 7];
    const player = WidgetNimbleGroupActorPlayerFactory('player', 2);
    const normalized = normalizeNimbleActorRanks([npc, player]);
    expect(normalized.map(actor => actor.rank)).toEqual([0, 1]);
    const normalizedNpc = normalized.find(actor => actor.type === 'npc');
    expect(normalizedNpc?.type === 'npc' && normalizedNpc.npc.hitPool).toEqual([4, 7]);
  });

  it('preserves the requested order while normalizing ranks', () => {
    const first = WidgetNimbleGroupActorPlayerFactory('first', 0);
    const second = WidgetNimbleGroupActorPlayerFactory('second', 1);

    const normalized = normalizeNimbleActorRanks([second, first]);

    expect(normalized.map(actor => actor.id)).toEqual(['second', 'first']);
    expect(normalized.map(actor => actor.rank)).toEqual([0, 1]);
  });
});
