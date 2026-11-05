import type { RollEvaluationResult } from '~/models/Dice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiceRoller } from './useDiceRoller';
import { useDiceRollHistory } from './useDiceRollHistory';

const evaluateMock = vi.hoisted(() => vi.fn());

vi.mock('~/utils/dice-evaluator', () => ({
  evaluateDiceExpression: evaluateMock,
}));

const createResult = (expression: string): RollEvaluationResult => ({
  expression,
  total: 1,
  breakdown: [],
  trace: { type: 'LITERAL', value: 1 },
  naturalHints: [],
  ast: { type: 'LITERAL', value: 1 },
  capped: false,
});

beforeEach(() => {
  vi.stubGlobal('ref', <T>(value: T) => ({ value }));
  vi.stubGlobal('computed', <T>(getter: () => T) => ({
    get value() {
      return getter();
    },
  }));
  vi.stubGlobal('useDiceRollHistory', useDiceRollHistory);
  evaluateMock.mockImplementation(async (expression: string) => createResult(expression));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('useDiceRoller history navigation', () => {
  it('restores the unsent draft after returning to the newest roll and ignores further Down presses', async () => {
    const roller = useDiceRoller();
    roller.expression.value = '1d4';
    await roller.roll();
    roller.expression.value = '2d6';
    await roller.roll();
    roller.expression.value = 'unsent draft';

    expect(roller.showPrevious()).toBe(true);
    expect(roller.expression.value).toBe('1d4');
    expect(roller.showNext()).toBe(true);
    expect(roller.expression.value).toBe('2d6');
    expect(roller.showNext()).toBe(false);
    expect(roller.expression.value).toBe('unsent draft');

    expect(roller.showNext()).toBe(false);
    expect(roller.expression.value).toBe('unsent draft');
  });

  it('restores an empty draft when leaving history', async () => {
    const roller = useDiceRoller();
    roller.expression.value = '1d4';
    await roller.roll();
    roller.expression.value = '2d6';
    await roller.roll();
    roller.expression.value = '';

    expect(roller.showPrevious()).toBe(true);
    expect(roller.showNext()).toBe(true);
    expect(roller.showNext()).toBe(false);
    expect(roller.expression.value).toBe('');
  });
});
