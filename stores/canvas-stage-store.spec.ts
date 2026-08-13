import { beforeEach, describe, expect, it, vi } from 'vitest';

const createRef = <T>(value: T) => ({
  get value() {
    return value;
  },
  set value(nextValue: T) {
    value = nextValue;
  },
});

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('ref', createRef);
  vi.stubGlobal('computed', (getter: () => unknown) => ({
    get value() {
      return getter();
    },
  }));
  vi.stubGlobal('defineStore', (_id: string, setup: () => unknown) => setup);
});

describe('canvas stage zoom', () => {
  it('starts at 100 percent and clamps all zoom changes to its bounds', async () => {
    const { useCanvasStageStore } = await import('~/stores/canvas-stage-store');
    const store = useCanvasStageStore();

    expect(store.zoom.value).toBe(1);

    store.setZoom(0);
    expect(store.zoom.value).toBe(0.5);

    store.setZoom(3);
    expect(store.zoom.value).toBe(2);

    store.setZoom(Number.NaN);
    expect(store.zoom.value).toBe(1);
  });

  it('increments, decrements, and resets without changing logical field dimensions', async () => {
    const { useCanvasStageStore } = await import('~/stores/canvas-stage-store');
    const store = useCanvasStageStore();
    const initialDimensions = [store.fieldWidth.value, store.fieldHeight.value];

    store.zoomIn();
    expect(store.zoom.value).toBeCloseTo(1.1);

    store.zoomOut();
    expect(store.zoom.value).toBeCloseTo(1);

    store.setZoom(2);
    store.zoomIn();
    expect(store.zoom.value).toBe(2);

    store.resetZoom();
    expect(store.zoom.value).toBe(1);
    expect([store.fieldWidth.value, store.fieldHeight.value]).toEqual(initialDimensions);
  });

  it('does not change the logical stage offset when zoom changes', async () => {
    const { useCanvasStageStore } = await import('~/stores/canvas-stage-store');
    const store = useCanvasStageStore();
    const offset = store._offset as unknown as { value: { x: number; y: number } };
    const scroll = store._scroll as unknown as { value: { x: number; y: number } };
    offset.value = { x: 100, y: 200 };
    scroll.value = { x: 10, y: 20 };

    store.setZoom(2);

    expect(store.stageConfig.value.x).toBe(90);
    expect(store.stageConfig.value.y).toBe(180);
    expect(offset.value).toEqual({ x: 100, y: 200 });
    expect(scroll.value).toEqual({ x: 10, y: 20 });
  });

  it('fits using logical stage dimensions regardless of viewport zoom', async () => {
    const { useCanvasStageStore } = await import('~/stores/canvas-stage-store');
    const store = useCanvasStageStore();
    store.applyConfig({ width: 2000, height: 2000 });
    const container = { width: 3000, height: 2000, scaleX: 1, scaleY: 1, x: 0, y: 0 };

    store.setZoom(0.5);
    const fitAtHalfZoom = store.fitToStage(container);
    store.setZoom(2);
    const fitAtDoubleZoom = store.fitToStage(container);

    expect(fitAtDoubleZoom).toEqual(fitAtHalfZoom);
  });

  it('does not produce a fit for a stage smaller than its padding', async () => {
    const { useCanvasStageStore } = await import('~/stores/canvas-stage-store');
    const store = useCanvasStageStore();
    store.applyConfig({ width: 500, height: 500 });
    const container = { width: 300, height: 300, scaleX: 1, scaleY: 1, x: 0, y: 0 };

    expect(store.fitToStage(container)).toEqual(container);
  });
});
