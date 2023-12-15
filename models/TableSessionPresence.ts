import type { TableSessionPresence } from '~/models/types';

const COLORS = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
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

export const TableSessionPresenceFactory = (
  sceneId: string,
  path: string[],
  displayName?: string,
  groupId?: string, // if undefined, assumed it is the owner who has no group
): TableSessionPresence => {
  if (!sceneId || path.length < 1) {
    throw new Error('Invalid TableSessionPresence');
  }

  const presence: TableSessionPresence = {
    sceneId,
    path,
    displayName: displayName ?? '',
    groupId: groupId ?? null,
    color: '',
  };

  if (groupId) {
    presence.color = pickColor(groupId);
  }

  return presence;
};
