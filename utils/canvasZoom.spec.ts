import { describe, expect, it } from 'vitest';
import { TableModes } from '~/models/types';
import { isCanvasZoomControlVisible } from '~/utils/canvasZoom';

describe('canvas zoom control visibility', () => {
  it('is available to owners even when they are not listed as editors', () => {
    expect(isCanvasZoomControlVisible(TableModes.OWN, { isOwner: true, isEditor: false })).toBe(true);
  });

  it('is available to editors but not presentation or viewer sessions', () => {
    expect(isCanvasZoomControlVisible(TableModes.EDIT, { isOwner: false, isEditor: true })).toBe(true);
    expect(isCanvasZoomControlVisible(TableModes.PRESENTATION, { isOwner: true, isEditor: false })).toBe(false);
    expect(isCanvasZoomControlVisible(TableModes.VIEW, { isOwner: false, isEditor: false })).toBe(false);
  });
});
