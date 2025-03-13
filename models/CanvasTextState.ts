import type { CanvasElementStateText } from '~/models/types';

export const CanvasTextStateFactory = (id: string, optional?: Partial<CanvasElementStateText>) => {
  if (!id) {
    throw new Error('id is required');
  }
  if (optional && optional._type) {
    throw new Error('optional._type is not allowed');
  }
  if (optional && optional.id) {
    throw new Error('optional.id is not allowed');
  }

  const state: CanvasElementStateText = {
    _type: 'text',
    id,
    selected: false,
    selectable: false,
    error: null,
    ...optional,
  };

  return state;
};
