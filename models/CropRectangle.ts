import type { CropRectangle } from '~/models/types';

/** Validate the shared crop rectangle structure and its millionth-coordinate bounds. */
export const isCropRectangle = (value: unknown): value is CropRectangle => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;

  const { x, y, w, h } = value as Record<string, unknown>;
  return [x, y, w, h].every(v => typeof v === 'number' && Number.isSafeInteger(v))
    && (x as number) >= 0 && (y as number) >= 0
    && (w as number) >= 1 && (h as number) >= 1
    && (x as number) + (w as number) <= 1_000_000
    && (y as number) + (h as number) <= 1_000_000;
};
