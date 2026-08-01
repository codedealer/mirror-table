import type { DicePoolNode, RandomGenerator } from '~/models/Dice';
import { describe, expect, it } from 'vitest';
import { isDiceProfileRequiredError } from '~/models/Dice';
import { evaluateAST } from './dice-evaluator';

const createSequenceRNG = (values: number[]): RandomGenerator => {
  let index = 0;
  return async () => {
    const value = values[index];
    index += 1;
    return value;
  };
};

const createConstantRNG = (value: number): RandomGenerator => async () => value;

describe('evaluateAST', () => {
  it('applies Keep/Drop against the initial roll: 4d6kh3 with [2,6,1,4] -> total 12, drops the 1', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 4,
      sides: 6,
      modifiers: [{ type: 'KEEP', target: 'HIGHEST', count: 3 }],
    };

    const result = await evaluateAST(pool, createSequenceRNG([2, 6, 1, 4]));

    expect(result.total).toBe(12);
    const [{ dice }] = result.breakdown;
    const dropped = dice.filter(die => die.flags.dropped);
    const kept = dice.filter(die => !die.flags.dropped);
    expect(dropped.map(die => die.rawRoll)).toEqual([1]);
    expect(kept.map(die => die.finalValue).sort((a, b) => b - a)).toEqual([6, 4, 2]);
  });

  it('cascades explosions per freshly rolled value: 1d6! with [6,6,3] -> 2 explosions, total 15', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 1,
      sides: 6,
      modifiers: [{ type: 'EXPLODE', condition: 'MAX', compounding: false }],
    };

    const result = await evaluateAST(pool, createSequenceRNG([6, 6, 3]));

    expect(result.total).toBe(15);
    const [{ dice }] = result.breakdown;
    expect(dice).toHaveLength(3); // original die + 2 explosions
    expect(result.capped).toBe(false);
  });

  it('clamps a value bump at the die\u2019s max sides: 2d6+^1 with [1,6] -> raw [1,6], final [2,6], total 8', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 2,
      sides: 6,
      modifiers: [{ type: 'VALUE_BUMP', amount: 1, clampAtMax: true }],
    };

    const result = await evaluateAST(pool, createSequenceRNG([1, 6]));

    expect(result.total).toBe(8);
    const [{ dice }] = result.breakdown;
    expect(dice.map(die => die.rawRoll)).toEqual([1, 6]);
    expect(dice.map(die => die.finalValue)).toEqual([2, 6]);
  });

  // Plan §7.1's example expression is `1d6r>=1`, but RerollModifier only supports
  // EXACT/LESS_EQUAL (no GREATER_EQUAL) - EXACT threshold:1 + a constant-1 RNG is an
  // equivalent never-satisfiable-stop case that exercises the same cap/flag behavior.
  it('caps a runaway reroll chain at 100 iterations without throwing', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 1,
      sides: 6,
      modifiers: [{ type: 'REROLL', condition: 'EXACT', threshold: 1, once: false }],
    };

    const result = await evaluateAST(pool, createConstantRNG(1));

    expect(result.capped).toBe(true);
    expect(result.total).toBe(1);
    const [{ dice }] = result.breakdown;
    expect(dice[0].flags.capped).toBe(true);
    expect(dice[0].flags.rerolled).toBe(true);
  });

  it('resolves positional explosion (!p) against surviving dice, not raw array index, when combined with a drop modifier', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 3,
      sides: 6,
      modifiers: [
        { type: 'DROP', target: 'LOWEST', count: 1 },
        { type: 'EXPLODE', condition: 'MAX', compounding: false, targetDieIndex: 0 },
      ],
    };

    // Rolls: [3, 6, 6]. Drop lowest 1 drops the 3 (index 0). Surviving order is [6, 6].
    // targetDieIndex: 0 must resolve to the first surviving 6 (index 1), not dice[0]
    // (the dropped 3, which would never explode under the old raw-index behavior).
    const result = await evaluateAST(pool, createSequenceRNG([3, 6, 6, 2]));

    expect(result.total).toBe(14); // 6 (exploded) + 6 (untouched) + 2 (explosion result)
    const [{ dice }] = result.breakdown;
    expect(dice).toHaveLength(4);
    expect(dice[0].flags.dropped).toBe(true);
    expect(dice[0].flags.exploded).toBeUndefined();
    expect(dice[1].flags.exploded).toBe(true);
    expect(dice[2].flags.exploded).toBeUndefined();
  });

  it('throws DiceProfileRequiredError for an un-lowered NIMBLE_DAMAGE_INTENT node', async () => {
    await expect(evaluateAST({
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 1, sides: 6 },
      advantage: false,
      disadvantage: false,
    }, createConstantRNG(1))).rejects.toSatisfy((err: unknown) => {
      return isDiceProfileRequiredError(err) && err.requiredProfile === 'nimble5e';
    });
  });

  it('throws DiceProfileRequiredError for an un-lowered ADVANTAGE_DISADVANTAGE_INTENT node', async () => {
    await expect(evaluateAST({
      type: 'ADVANTAGE_DISADVANTAGE_INTENT',
      baseDice: { count: 1, sides: 20 },
      mode: 'ADVANTAGE',
      extraDice: 1,
    }, createConstantRNG(10))).rejects.toSatisfy((err: unknown) => {
      return isDiceProfileRequiredError(err) && err.requiredProfile === 'dnd5e';
    });
  });
});
