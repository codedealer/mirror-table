import type { DicePoolNode, RandomGenerator } from '~/models/Dice';
import { describe, expect, it } from 'vitest';
import { isDiceProfileRequiredError } from '~/models/Dice';
import { evaluateAST, evaluateDiceExpression } from './dice-evaluator';
import { Dnd5eProfile, NimbleProfile } from './dice-lowering';

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

  it('applies an uncapped value bump at the die\u2019s max sides: 2d6+^1 with [1,6] -> raw [1,6], settled [2,7], total 9', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 2,
      sides: 6,
      modifiers: [{ type: 'VALUE_BUMP', amount: 1, clampAtMax: true }],
    };

    const result = await evaluateAST(pool, createSequenceRNG([1, 6]));

    expect(result.total).toBe(9);
    const [{ dice }] = result.breakdown;
    expect(dice.map(die => die.rawRoll)).toEqual([1, 6]);
    expect(dice.map(die => die.finalValue)).toEqual([2, 7]);
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
    expect(result.trace).toMatchObject({
      type: 'POOL',
      capped: true,
      dice: [{ dieId: 1, capped: true }],
    });
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
      extraDice: 1,
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

  it('returns a semantic trace with kept and dropped face identity from the public expression evaluator', async () => {
    const result = await evaluateDiceExpression('4d6kh3', createSequenceRNG([2, 6, 1, 4]));

    expect(result.total).toBe(12);
    expect(result.trace).toMatchObject({
      type: 'POOL',
      subtotal: 12,
      dice: [
        { dieId: 1, initialRoll: 2, dropped: false },
        { dieId: 2, initialRoll: 6, dropped: false },
        { dieId: 3, initialRoll: 1, dropped: true },
        { dieId: 4, initialRoll: 4, dropped: false },
      ],
    });
  });

  it('records reroll replacement faces, Explosion ancestry, pool subtotal, and arithmetic', async () => {
    const result = await evaluateDiceExpression('1d6ro1! + 2', createSequenceRNG([1, 6, 3]));

    expect(result.total).toBe(11);
    expect(result.trace).toMatchObject({
      type: 'ARITHMETIC',
      operator: '+',
      leftValue: 9,
      rightValue: 2,
      value: 11,
      left: {
        type: 'POOL',
        subtotal: 9,
        dice: [
          {
            dieId: 1,
            initialRoll: 1,
            rerolls: [6],
            finalValue: 6,
            exploded: true,
            events: [
              { type: 'ROLLED', value: 1 },
              { type: 'REROLLED', from: 1, to: 6 },
              { type: 'EXPLODED', value: 3, generatedDieId: 2 },
            ],
          },
          {
            dieId: 2,
            initialRoll: 3,
            generatedBy: 1,
            events: [
              { type: 'ROLLED', value: 3 },
              { type: 'ADDED_BY_EXPLOSION', sourceDieId: 1 },
            ],
          },
        ],
      },
      right: { type: 'LITERAL', value: 2 },
    });
  });

  it('evaluates repetitions with fresh sequential RNG draws and sums each independent outcome', async () => {
    const result = await evaluateDiceExpression('(1d6 + 1d6)~2', createSequenceRNG([1, 2, 3, 4]));

    expect(result.total).toBe(10);
    expect(result.breakdown.map(pool => pool.dice[0].rawRoll)).toEqual([1, 2, 3, 4]);
    expect(result.trace).toMatchObject({
      type: 'REPETITION',
      count: 2,
      value: 10,
      repetitions: [
        { type: 'ARITHMETIC', leftValue: 1, rightValue: 2, value: 3 },
        { type: 'ARITHMETIC', leftValue: 3, rightValue: 4, value: 7 },
      ],
    });

    // Multiplication remains a single evaluation, not independent repetition semantics.
    const multiplied = await evaluateDiceExpression('(1d6) * 2', createSequenceRNG([4]));
    expect(multiplied.total).toBe(8);
    expect(multiplied.trace.type).toBe('ARITHMETIC');

    const nimbleProduct = await evaluateDiceExpression('(nd 1d6) * 5', createSequenceRNG([1]), NimbleProfile);
    expect(nimbleProduct.total).toBe(0);
    expect(nimbleProduct.trace).toMatchObject({ type: 'ARITHMETIC', left: { type: 'GROUPED_POOL', voided: true }, rightValue: 5 });
  });

  it('voids a Nimble Grouped Pool and its modifier while sibling groups and arithmetic still contribute', async () => {
    const result = await evaluateDiceExpression('(nd 2d6 + 5) + (nd 3d6 + 2) - 3', createSequenceRNG([1, 4, 3, 2, 6]), NimbleProfile);

    expect(result.total).toBe(10);
    expect(result.trace).toMatchObject({
      type: 'ARITHMETIC',
      operator: '-',
      leftValue: 13,
      rightValue: 3,
      value: 10,
      left: {
        type: 'ARITHMETIC',
        operator: '+',
        leftValue: 0,
        rightValue: 13,
        value: 13,
        left: {
          type: 'GROUPED_POOL',
          intent: 'nimble-damage',
          value: 0,
          flatModifier: 5,
          voided: true,
          preVoidValue: 10,
          pools: [
            { type: 'POOL', subtotal: 1, dice: [{ initialRoll: 1 }] },
            { type: 'POOL', subtotal: 4, dice: [{ initialRoll: 4 }] },
          ],
        },
        right: {
          type: 'GROUPED_POOL',
          intent: 'nimble-damage',
          value: 13,
          flatModifier: 2,
          pools: [
            { type: 'POOL', subtotal: 3, dice: [{ initialRoll: 3 }] },
            { type: 'POOL', subtotal: 8, dice: [{ initialRoll: 2 }, { initialRoll: 6 }] },
          ],
        },
      },
    });
    expect(result.breakdown.map(pool => pool.subtotal)).toEqual([1, 4, 3, 8]);
  });

  it('keeps Nimble critical misses local within each repetition and under the none profile', async () => {
    const nimble = await evaluateDiceExpression('(nd 1d6 + 2 + 1d6)~2', createSequenceRNG([1, 3, 4, 5]), NimbleProfile);

    expect(nimble.total).toBe(14);
    expect(nimble.trace).toMatchObject({
      type: 'REPETITION',
      repetitions: [
        { type: 'ARITHMETIC', left: { type: 'GROUPED_POOL', voided: true, value: 0 }, right: { type: 'POOL', subtotal: 3 }, value: 3 },
        { type: 'ARITHMETIC', left: { type: 'GROUPED_POOL', value: 6 }, right: { type: 'POOL', subtotal: 5 }, value: 11 },
      ],
    });

    const noProfile = await evaluateDiceExpression('(1d6)~3', createSequenceRNG([2, 4, 6]));
    expect(noProfile.total).toBe(12);
    expect(noProfile.naturalHints).toEqual([]);
    expect(noProfile.trace).toMatchObject({
      type: 'REPETITION',
      repetitions: [
        { type: 'POOL', subtotal: 2 },
        { type: 'POOL', subtotal: 4 },
        { type: 'POOL', subtotal: 6 },
      ],
    });
  });

  it('retains System Intent provenance and die identity for downstream profile policies', async () => {
    const result = await evaluateDiceExpression('nd 2d6', createSequenceRNG([5, 2]), NimbleProfile);

    expect(result.trace).toMatchObject({
      type: 'GROUPED_POOL',
      value: 7,
      pools: [
        { type: 'POOL', provenance: { intent: 'nimble-damage', role: 'primary' }, dice: [{ dieId: 1, initialRoll: 5 }] },
        { type: 'POOL', provenance: { intent: 'nimble-damage', role: 'extra' }, dice: [{ dieId: 2, initialRoll: 2 }] },
      ],
    });
    expect(result.breakdown.map(pool => pool.provenance?.role)).toEqual(['primary', 'extra']);
  });

  it('detects D&D naturals only on the sole surviving d20 after Keep/Drop', async () => {
    const advantageMaximum = await evaluateDiceExpression('1d20a', createSequenceRNG([1, 20]), Dnd5eProfile);
    expect(advantageMaximum.total).toBe(20);
    expect(advantageMaximum.naturalHints).toEqual([{
      kind: 'maximum',
      face: 20,
      sides: 20,
      dieId: 2,
      poolId: 1,
      context: 'D&D advantage/disadvantage pool',
    }]);

    const disadvantageMinimum = await evaluateDiceExpression('1d20d', createSequenceRNG([20, 1]), Dnd5eProfile);
    expect(disadvantageMinimum.naturalHints).toMatchObject([{ kind: 'minimum', face: 1, dieId: 2 }]);
  });

  it('ignores dropped naturals, multiple surviving d20s, and profiles without a natural detector', async () => {
    const droppedMaximum = await evaluateDiceExpression('1d20d', createSequenceRNG([20, 10]), Dnd5eProfile);
    expect(droppedMaximum.naturalHints).toEqual([]);

    const droppedMinimum = await evaluateDiceExpression('1d20a', createSequenceRNG([1, 10]), Dnd5eProfile);
    expect(droppedMinimum.naturalHints).toEqual([]);

    const multipleSurvivors = await evaluateDiceExpression('2d20', createSequenceRNG([1, 20]), Dnd5eProfile);
    expect(multipleSurvivors.naturalHints).toEqual([]);

    const noProfile = await evaluateDiceExpression('1d20', createSequenceRNG([20]));
    expect(noProfile.naturalHints).toEqual([]);

    // The screenshot's ordinary Keep-lowest expression is intentionally profile-gated:
    // the same surviving face has no hint under the default No profile setting.
    const noProfileKeepLowest = await evaluateDiceExpression('2d20kl1', createSequenceRNG([1, 3]));
    expect(noProfileKeepLowest.total).toBe(1);
    expect(noProfileKeepLowest.naturalHints).toEqual([]);
  });

  it('detects the surviving natural 1 for the exact 2d20kl1 D&D 5e profile case', async () => {
    const result = await evaluateDiceExpression('2d20kl1', createSequenceRNG([1, 3]), Dnd5eProfile);

    expect(result.total).toBe(1);
    expect(result.trace).toMatchObject({
      type: 'POOL',
      sides: 20,
      subtotal: 1,
      dice: [
        { initialRoll: 1, finalValue: 1, dropped: false },
        { initialRoll: 3, finalValue: 3, dropped: true },
      ],
    });
    expect(result.naturalHints).toMatchObject([{ kind: 'minimum', face: 1, sides: 20 }]);
  });

  it('uses the post-reroll face for D&D natural detection', async () => {
    const rerolled = await evaluateDiceExpression('1d20ro1', createSequenceRNG([1, 20]), Dnd5eProfile);
    expect(rerolled.naturalHints).toMatchObject([{ kind: 'maximum', face: 20 }]);
  });

  it('uses the post-reroll primary face for Nimble critical misses and voids its flat modifier only', async () => {
    const intent = NimbleProfile.lowerAST({
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 2, sides: 6 },
      advantage: false,
      disadvantage: false,
      extraDice: 1,
      flatModifier: 5,
    });
    if (intent.type !== 'GROUPED_POOL')
      throw new Error('Expected lowered Nimble group');
    intent.pools[0].modifiers.push({ type: 'REROLL', condition: 'EXACT', threshold: 1, once: true });
    const rerolledMiss = await evaluateAST(intent, createSequenceRNG([1, 1, 1]), 'nd 2d6ro1+5', NimbleProfile);
    expect(rerolledMiss.total).toBe(0);
    expect(rerolledMiss.trace).toMatchObject({ type: 'GROUPED_POOL', voided: true, preVoidValue: 7, flatModifier: 5, value: 0 });
    expect(rerolledMiss.naturalHints).toMatchObject([{ kind: 'minimum', face: 1, context: 'Nimble Primary Die' }]);

    const independentGroups = await evaluateDiceExpression('(nd 2d6+5) + (nd 3d6-1)', createSequenceRNG([1, 3, 4, 5, 6]), NimbleProfile);
    expect(independentGroups.total).toBe(14);
    expect(independentGroups.trace).toMatchObject({
      type: 'ARITHMETIC',
      left: { type: 'GROUPED_POOL', value: 0, voided: true, flatModifier: 5 },
      right: { type: 'ARITHMETIC', value: 14 },
    });

    const droppedOne = await evaluateDiceExpression('nd 1d6a', createSequenceRNG([1, 4]), NimbleProfile);
    expect(droppedOne.total).toBe(4);
    expect(droppedOne.naturalHints).toEqual([]);
    expect(droppedOne.trace).toMatchObject({ type: 'GROUPED_POOL', intent: 'nimble-damage', value: 4 });
  });

  it('detects Nimble settled maxima and explodes bumped Primary Dice, including generated chains', async () => {
    const makeNimbleBumpedPrimary = (): DicePoolNode => ({
      type: 'DICE_POOL',
      count: 1,
      sides: 6,
      provenance: { intent: 'nimble-damage', role: 'primary' },
      modifiers: [
        { type: 'VALUE_BUMP', amount: 1, clampAtMax: false },
        { type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true },
      ],
    });

    const settledSix = await evaluateAST(makeNimbleBumpedPrimary(), createSequenceRNG([5, 2]), '1d6+^1', NimbleProfile);
    expect(settledSix.total).toBe(8);
    expect(settledSix.naturalHints).toMatchObject([{ kind: 'maximum', face: 6 }]);
    expect(settledSix.breakdown[0].dice[0].flags.exploded).toBe(true);

    const settledSevenChain = await evaluateAST(makeNimbleBumpedPrimary(), createSequenceRNG([6, 6, 2]), '1d6+^1', NimbleProfile);
    expect(settledSevenChain.total).toBe(15);
    expect(settledSevenChain.naturalHints).toMatchObject([{ kind: 'maximum', face: 7 }]);
    expect(settledSevenChain.breakdown[0].dice.map(die => die.finalValue)).toEqual([7, 6, 2]);
    expect(settledSevenChain.breakdown[0].dice[0].flags.exploded).toBe(true);
    expect(settledSevenChain.breakdown[0].dice[0].events?.filter(event => event.type === 'EXPLODED')).toHaveLength(2);

    const publicBump = await evaluateDiceExpression('1d6+^1', createSequenceRNG([6]), NimbleProfile);
    expect(publicBump.total).toBe(7);
    expect(publicBump.naturalHints).toMatchObject([{ kind: 'maximum', face: 7 }]);

    const groupedNaturals = await evaluateDiceExpression('(nd 1d6) + (nd 1d8)', createSequenceRNG([6, 2, 8, 3]), NimbleProfile);
    expect(groupedNaturals.naturalHints).toMatchObject([
      { kind: 'maximum', face: 6, sides: 6 },
      { kind: 'maximum', face: 8, sides: 8 },
    ]);
  });

  it('resolves positional explosion (![N]) at an arbitrary non-primary index', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 2,
      sides: 6,
      modifiers: [{ type: 'EXPLODE', condition: 'MAX', compounding: false, targetDieIndex: 1 }],
    };

    // Rolls: [3, 6]. targetDieIndex: 1 (die #2, i.e. ![2]) restricts explosion to the second die only.
    const result = await evaluateAST(pool, createSequenceRNG([3, 6, 4]));

    expect(result.total).toBe(13); // 3 (untouched) + 6 (exploded) + 4 (explosion result)
    const [{ dice }] = result.breakdown;
    expect(dice[0].flags.exploded).toBeUndefined();
    expect(dice[1].flags.exploded).toBe(true);
  });

  it('restricts reroll to the positional target die ([N]), leaving other dice untouched', async () => {
    const pool: DicePoolNode = {
      type: 'DICE_POOL',
      count: 2,
      sides: 6,
      modifiers: [{ type: 'REROLL', condition: 'EXACT', threshold: 5, once: false, targetDieIndex: 1 }],
    };

    // Initial rolls: [5, 5]. targetDieIndex: 1 (die #2, i.e. r5[2]) restricts the reroll to the second die only.
    const result = await evaluateAST(pool, createSequenceRNG([5, 5, 2]));

    expect(result.total).toBe(7); // 5 (untouched) + 2 (rerolled)
    const [{ dice }] = result.breakdown;
    expect(dice[0].finalValue).toBe(5);
    expect(dice[0].flags.rerolled).toBeUndefined();
    expect(dice[1].finalValue).toBe(2);
    expect(dice[1].flags.rerolled).toBe(true);
  });
});
