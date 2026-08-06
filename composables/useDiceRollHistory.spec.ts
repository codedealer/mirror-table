import type { RollEvaluationResult } from '~/models/Dice';
import { describe, expect, it, vi } from 'vitest';
import { useDiceRollHistory } from './useDiceRollHistory';

const createResult = (expression: string): RollEvaluationResult => ({
  expression,
  total: 1,
  breakdown: [],
});

describe('useDiceRollHistory', () => {
  it('starts navigation at the latest roll so the first Up shows the previous roll', () => {
    vi.stubGlobal('ref', <T>(value: T) => ({ value }));
    const { add, previous, next, cursor } = useDiceRollHistory();
    const first = createResult('1d6');
    const second = createResult('2d6');

    add(first);
    add(second);

    expect(cursor.value).toBe(0);
    expect(previous()).toBe(first);
    expect(next()).toBe(second);
    expect(next()).toBeUndefined();
    expect(cursor.value).toBe(-1);
  });
});
