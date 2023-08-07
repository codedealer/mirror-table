import type { Profile } from './types';

export const ProfileFactory = (): Profile => ({
  settings: {
    driveFolderId: '',
  },
});
