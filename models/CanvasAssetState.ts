import type { CanvasElementStateAsset } from '~/models/types';

export const CanvasAssetStateFactory = (id: string, optional?: Partial<CanvasElementStateAsset>) => {
  if (!id) {
    throw new Error('id is required');
  }
  if (optional && optional._type) {
    throw new Error('optional._type is not allowed');
  }
  if (optional && optional.id) {
    throw new Error('optional.id is not allowed');
  }

  const state: CanvasElementStateAsset = {
    _type: 'asset',
    id,
    loading: false,
    loaded: false,
    selected: false,
    selectable: false,
    error: null,
    ...optional,
  };

  return state;
};
