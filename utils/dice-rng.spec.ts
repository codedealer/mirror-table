import { describe, expect, it, vi } from 'vitest';
import { createRandomOrgRNG, RANDOM_ORG_LOW_WATERMARK, RANDOM_ORG_SAMPLE_SIZE } from './dice-rng';

describe('createRandomOrgRNG', () => {
  it('refills each sides bucket once and starts low-watermark refill', async () => {
    const values = Array.from({ length: RANDOM_ORG_SAMPLE_SIZE }, (_, index) => (index % 6) + 1);
    const fetcher = vi.fn(async () => values);
    const rng = createRandomOrgRNG(fetcher);

    expect(await rng(1, 6)).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    for (let index = 0; index < RANDOM_ORG_SAMPLE_SIZE - RANDOM_ORG_LOW_WATERMARK - 1; index++)
      await rng(1, 6);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await rng(1, 20)).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('gates concurrent refills for the same sides value', async () => {
    let resolveRefill!: (values: number[]) => void;
    const fetcher = vi.fn(() => new Promise<number[]>((resolve) => {
      resolveRefill = resolve;
    }));
    const rng = createRandomOrgRNG(fetcher);

    const first = rng(1, 6);
    const second = rng(1, 6);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveRefill([1, 2]);
    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
  });
});
