import type { TableSessionPresence } from '~/models/types';

const COLORS = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#2DE8FA', // this is the first local color
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#009688',
  '#4caf50',
  '#ff9800',
  '#ff5722',
];

const pickColor = (str: string) => {
  const hash = str.split('').reduce((acc, c) => {
    acc = ((acc << 5) - acc) + c.charCodeAt(0);
    return acc & acc;
  }, 0);
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

export const LOCAL_GROUP_ID_PREFIX = 'local' as const;
export const LOCAL_NAME_PREFIX = 'Presentation' as const;

export const TableSessionPresenceFactory = (
  sessionId: string,
  sceneId: string,
  path: string[],
  displayName?: string,
  groupId?: string, // if undefined, assumed it is the owner who has no group
  groupLabel?: string,
): TableSessionPresence => {
  if (!sceneId || path.length < 1 || !sessionId) {
    throw new Error('Invalid TableSessionPresence');
  }

  const presence: TableSessionPresence = {
    sessionId,
    enabled: true,
    sceneId,
    path,
    displayName: displayName ?? '',
    groupId: groupId ?? null,
    groupLabel: groupLabel ?? '',
    color: '',
  };

  if (groupId) {
    presence.color = pickColor(groupId);
  }

  return presence;
};
