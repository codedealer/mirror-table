import type {
  WidgetNimbleGroup,
  WidgetNimbleGroupActor,
  WidgetNimbleGroupActorNpc,
  WidgetNimbleGroupActorPlayer,
} from '~/models/types';
import { WidgetTemplates } from '~/models/types';

const emptyShared = (id = '', rank = 0) => ({
  id,
  name: '',
  role: '',
  avatar: null,
  conditions: [],
  content: '',
  privateContent: '',
  enabled: false,
  rank,
});

export const WidgetNimbleGroupFactory = (fileId: string): WidgetNimbleGroup => ({
  id: '',
  fileId,
  owner: '',
  enabled: false,
  template: WidgetTemplates.NIMBLE_GROUP,
  rank: Date.now(),
  actors: [],
});

export const WidgetNimbleGroupActorPlayerFactory = (id = '', rank = 0): WidgetNimbleGroupActorPlayer => ({
  ...emptyShared(id, rank),
  type: 'player',
  player: {
    stats: { wil: 0, str: 0, dex: 0, int: 0 },
    armor: 0,
    hitPoints: { current: 0, max: 0, temp: 0 },
    wounds: { current: 0, max: 0 },
    speed: '',
  },
});

export const WidgetNimbleGroupActorNpcFactory = (id = '', rank = 0): WidgetNimbleGroupActorNpc => ({
  ...emptyShared(id, rank),
  type: 'npc',
  npc: {
    stats: { wil: 0, str: 0, dex: 0, int: 0 },
    armor: '',
    speed: '',
    hitPool: [0],
    subtype: 'regular',
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const isNimbleNumber = (value: unknown): value is number | '' => {
  return value === '' || (typeof value === 'number' && Number.isFinite(value));
};

const hasNimbleNumbers = (value: unknown, fields: readonly string[]): boolean => {
  return isRecord(value) && fields.every(field => isNimbleNumber(value[field]));
};

const hasNimbleActorConditions = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(condition => typeof condition === 'string');
};

const isNimbleActorAvatar = (value: unknown): boolean => {
  return value === null || (isRecord(value)
    && typeof value.id === 'string'
    && typeof value.nativeWidth === 'number'
    && Number.isFinite(value.nativeWidth)
    && typeof value.nativeHeight === 'number'
    && Number.isFinite(value.nativeHeight)
    && typeof value.scaleX === 'number'
    && Number.isFinite(value.scaleX)
    && typeof value.scaleY === 'number'
    && Number.isFinite(value.scaleY)
    && (value.rotation === undefined || (typeof value.rotation === 'number' && Number.isFinite(value.rotation))));
};

const hasNimbleActorBase = (value: Record<string, unknown>): boolean => {
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.role === 'string'
    && isNimbleActorAvatar(value.avatar)
    && hasNimbleActorConditions(value.conditions)
    && typeof value.content === 'string'
    && typeof value.privateContent === 'string'
    && typeof value.enabled === 'boolean'
    && typeof value.rank === 'number'
    && Number.isFinite(value.rank);
};

export const isWidgetNimbleGroupActorPlayer = (value: unknown): value is WidgetNimbleGroupActorPlayer => {
  if (!isRecord(value) || !hasNimbleActorBase(value) || value.type !== 'player' || !isRecord(value.player)) {
    return false;
  }

  if (!hasNimbleActorConditions(value.conditions)) {
    return false;
  }

  const player = value.player;
  return hasNimbleNumbers(player.stats, ['wil', 'str', 'dex', 'int'])
    && isNimbleNumber(player.armor)
    && hasNimbleNumbers(player.hitPoints, ['current', 'max', 'temp'])
    && hasNimbleNumbers(player.wounds, ['current', 'max'])
    && typeof player.speed === 'string';
};

export const isWidgetNimbleGroupActorNpc = (value: unknown): value is WidgetNimbleGroupActorNpc => {
  if (!isRecord(value) || !hasNimbleActorBase(value)) {
    return false;
  }

  if (value.type !== 'npc' || !isRecord(value.npc)) {
    return false;
  }

  if (!hasNimbleActorConditions(value.conditions)) {
    return false;
  }

  const npc = value.npc;
  return hasNimbleNumbers(npc.stats, ['wil', 'str', 'dex', 'int'])
    && typeof npc.speed === 'string'
    && ['', 'medium', 'heavy'].includes(npc.armor as string)
    && ['minion', 'flunky', 'regular', 'legendary'].includes(npc.subtype as string)
    && Array.isArray(npc.hitPool);
};

export const isWidgetNimbleGroupActor = (value: unknown): value is WidgetNimbleGroupActor => {
  return isWidgetNimbleGroupActorPlayer(value) || isWidgetNimbleGroupActorNpc(value);
};

export const isWidgetNimbleGroup = (value: unknown): value is WidgetNimbleGroup => {
  return !!value
    && typeof value === 'object'
    && (value as WidgetNimbleGroup).template === WidgetTemplates.NIMBLE_GROUP
    && Array.isArray((value as WidgetNimbleGroup).actors)
    && (value as WidgetNimbleGroup).actors.every(isWidgetNimbleGroupActor);
};

export const normalizeNimbleConditions = (conditions: string[]): string[] => {
  return conditions.reduce<string[]>((normalized, condition) => {
    const trimmed = condition.trim();
    if (trimmed && !normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
    return normalized;
  }, []);
};

export const isNimbleValueSet = (value: unknown): boolean => value !== '' && value !== null && value !== undefined;

export const hasCompleteNimbleResource = (current: unknown, max: unknown): boolean => {
  return isNimbleValueSet(current) && isNimbleValueSet(max) && Number(max) > 0;
};

export const sortNimbleActors = (actors: WidgetNimbleGroupActor[]): WidgetNimbleGroupActor[] => {
  return [...actors].sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));
};

export const normalizeNimbleActorRanks = (actors: WidgetNimbleGroupActor[]): WidgetNimbleGroupActor[] => {
  return actors.map((actor, rank) => ({ ...actor, rank }));
};
