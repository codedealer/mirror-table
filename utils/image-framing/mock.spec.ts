import { describe, expect, it } from 'vitest';
import { frameMatchesRatio, targetSize } from './geometry';
import { isAnimated, makeFrame, maxZoom, MockImageRepository, outputSize, validFrame } from './mock';

describe('local image framing', () => {
  it('covers both ratios, constrains panning and never upscales', () => {
    for (const ratio of [1, 2]) {
      const frame = makeFrame(1200, 800, ratio, 2, -1, 2);
      expect(validFrame(frame)).toBe(true);
      expect(frame.x).toBe(0);
      expect(frame.y + frame.h).toBe(1_000_000);
      expect((frame.w * 1200) / (frame.h * 800)).toBeCloseTo(ratio, 4);
    }
  });

  it('requires the full target resolution and limits zoom for both ratios', () => {
    for (const ratio of [1, 2]) {
      const targetHeight = 512 / ratio;
      expect(maxZoom(511, 512, ratio)).toBeNull();
      expect(maxZoom(512, targetHeight, ratio)).toBe(1);
      expect(outputSize(512, targetHeight, makeFrame(512, targetHeight, ratio, 1, 0.5, 0.5), ratio)).toEqual({ width: 512, height: targetHeight });
      const limit = maxZoom(1231, 947, ratio)!;
      const frame = makeFrame(1231, 947, ratio, limit, 0.5, 0.5);
      expect(outputSize(1231, 947, frame, ratio)).toEqual({ width: 512, height: targetHeight });
      expect(outputSize(511, 512, makeFrame(511, 512, ratio, 1, 0.5, 0.5), ratio)).toBeNull();
    }
    expect(maxZoom(9000, 9000, 1)).toBe(8);
  });

  it('supports portrait and wider fixed output ratios without upscaling', () => {
    for (const [ratio, target] of [[0.5, { width: 256, height: 512 }], [4, { width: 512, height: 128 }]] as const) {
      expect(targetSize(ratio)).toEqual(target);
      expect(maxZoom(target.width - 1, target.height, ratio)).toBeNull();
      const limit = maxZoom(target.width * 2, target.height * 2, ratio)!;
      expect(limit).toBe(2);
      const frame = makeFrame(target.width * 2, target.height * 2, ratio, limit, 0.5, 0.5);
      expect(outputSize(target.width * 2, target.height * 2, frame, ratio)).toEqual(target);
    }
    expect(() => targetSize(0)).toThrow('Unsupported');
  });

  it('accepts generated frames throughout the supported ratio range on reopening', () => {
    for (const ratio of [1 / 512, 1 / 300, 0.1, 0.5, 1, 2, 10, 300, 512]) {
      for (const [width, height] of [[1000, 1000], [3000, 2000], [1200, 3600]]) {
        for (const zoom of [1, 1.5, 2]) {
          const frame = makeFrame(width, height, ratio, zoom, 0.37, 0.61);
          expect(frameMatchesRatio(frame, width, height, ratio), `${ratio} ${width}x${height} zoom ${zoom}`).toBe(true);
        }
      }
    }
    expect(frameMatchesRatio({ x: 0, y: 0, w: 1_000_000, h: 500_000 }, 1000, 1000, 1)).toBe(false);
    expect(frameMatchesRatio({ x: 0, y: 0, w: 1, h: 1 }, 1000, 1000, 513)).toBe(false);
  });

  it('recognises animated PNG and WebP chunks', async () => {
    const apng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 97, 99, 84, 76, 0, 0, 0, 0]);
    const webp = new Uint8Array([82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80, 65, 78, 73, 77, 0, 0, 0, 0]);
    expect(await isAnimated(new Blob([apng]))).toBe(true);
    expect(await isAnimated(new Blob([webp]))).toBe(true);
    expect(await isAnimated(new Blob(['static']))).toBe(false);
  });

  it('reopens derivatives directly from their original and detects loss or changes', () => {
    const repo = new MockImageRepository();
    const original = repo.add('original', new Blob(['source']));
    const frame = makeFrame(1000, 500, 1, 1, 0.5, 0.5);
    const crop = repo.add('crop', new Blob(['crop']), { originalId: original.id, originalRevision: original.revision, frame });
    const reopened = repo.resolve(crop.id);
    const second = repo.add('second', new Blob(['second']), { originalId: reopened.original.id, originalRevision: reopened.original.revision, frame: reopened.frame! });
    expect(repo.resolve(second.id).original.id).toBe(original.id);
    repo.change(original.id);
    expect(() => repo.resolve(second.id)).toThrow('changed');
    repo.remove(original.id);
    expect(() => repo.resolve(second.id)).toThrow('missing');
    expect(repo.get(second.id)).toBeDefined();
  });
});
