import type { AdvantageDisadvantageIntentNode, NimbleDamageIntentNode } from '~/models/Dice';
import { describe, expect, it } from 'vitest';
import { Dnd5eProfile, lowerAST, NimbleProfile } from './dice-lowering';

describe('nimbleProfile', () => {
  it('lowers a NIMBLE_DAMAGE_INTENT with advantage to a 2-die primary pool plus a secondary pool', () => {
    const intent: NimbleDamageIntentNode = {
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 3, sides: 6 },
      advantage: true,
      disadvantage: false,
      extraDice: 1,
    };

    expect(lowerAST(intent, NimbleProfile)).toEqual({
      type: 'GROUPED_POOL',
      intent: 'nimble-damage',
      pools: [
        {
          type: 'DICE_POOL',
          count: 2,
          sides: 6,
          modifiers: [
            { type: 'DROP', target: 'LOWEST', count: 1 },
            { type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true },
          ],
          provenance: { intent: 'nimble-damage', role: 'primary' },
        },
        { type: 'DICE_POOL', count: 2, sides: 6, modifiers: [], provenance: { intent: 'nimble-damage', role: 'extra' } },
      ],
    });
  });

  it('stacks advantage across M extra dice: (1+M)dX with DROP LOWEST M, plus a secondary pool', () => {
    const intent: NimbleDamageIntentNode = {
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 3, sides: 6 },
      advantage: true,
      disadvantage: false,
      extraDice: 2,
    };

    expect(lowerAST(intent, NimbleProfile)).toEqual({
      type: 'GROUPED_POOL',
      intent: 'nimble-damage',
      pools: [
        {
          type: 'DICE_POOL',
          count: 3,
          sides: 6,
          modifiers: [
            { type: 'DROP', target: 'LOWEST', count: 2 },
            { type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true },
          ],
          provenance: { intent: 'nimble-damage', role: 'primary' },
        },
        { type: 'DICE_POOL', count: 2, sides: 6, modifiers: [], provenance: { intent: 'nimble-damage', role: 'extra' } },
      ],
    });
  });

  it('stacks disadvantage across M extra dice: (1+M)dX with DROP HIGHEST M', () => {
    const intent: NimbleDamageIntentNode = {
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 1, sides: 8 },
      advantage: false,
      disadvantage: true,
      extraDice: 3,
    };

    expect(lowerAST(intent, NimbleProfile)).toEqual({
      type: 'GROUPED_POOL',
      intent: 'nimble-damage',
      pools: [
        {
          type: 'DICE_POOL',
          count: 4,
          sides: 8,
          modifiers: [
            { type: 'DROP', target: 'HIGHEST', count: 3 },
            { type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true },
          ],
          provenance: { intent: 'nimble-damage', role: 'primary' },
        },
      ],
    });
  });

  it('retains the trailing flat modifier on its Nimble group for local voiding', () => {
    const intent: NimbleDamageIntentNode = {
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 1, sides: 6 },
      advantage: false,
      disadvantage: false,
      extraDice: 1,
      flatModifier: 4,
    };

    expect(lowerAST(intent, NimbleProfile)).toEqual({
      type: 'GROUPED_POOL',
      intent: 'nimble-damage',
      flatModifier: 4,
      pools: [
        {
          type: 'DICE_POOL',
          count: 1,
          sides: 6,
          modifiers: [{ type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true }],
          provenance: { intent: 'nimble-damage', role: 'primary' },
        },
      ],
    });
  });
});

describe('dnd5eProfile', () => {
  it('lowers ADVANTAGE to (count + extraDice)dX with DROP LOWEST extraDice', () => {
    const intent: AdvantageDisadvantageIntentNode = {
      type: 'ADVANTAGE_DISADVANTAGE_INTENT',
      baseDice: { count: 2, sides: 20 },
      mode: 'ADVANTAGE',
      extraDice: 3,
    };

    expect(lowerAST(intent, Dnd5eProfile)).toEqual({
      type: 'DICE_POOL',
      count: 5,
      sides: 20,
      modifiers: [{ type: 'DROP', target: 'LOWEST', count: 3 }],
      provenance: { intent: 'dnd5e-advantage' },
    });
  });

  it('lowers DISADVANTAGE to (count + extraDice)dX with DROP HIGHEST extraDice', () => {
    const intent: AdvantageDisadvantageIntentNode = {
      type: 'ADVANTAGE_DISADVANTAGE_INTENT',
      baseDice: { count: 1, sides: 20 },
      mode: 'DISADVANTAGE',
      extraDice: 2,
    };

    expect(lowerAST(intent, Dnd5eProfile)).toEqual({
      type: 'DICE_POOL',
      count: 3,
      sides: 20,
      modifiers: [{ type: 'DROP', target: 'HIGHEST', count: 2 }],
      provenance: { intent: 'dnd5e-advantage' },
    });
  });
});

describe('lowerAST', () => {
  it('leaves intent nodes belonging to another profile untouched', () => {
    const intent: AdvantageDisadvantageIntentNode = {
      type: 'ADVANTAGE_DISADVANTAGE_INTENT',
      baseDice: { count: 1, sides: 20 },
      mode: 'ADVANTAGE',
      extraDice: 1,
    };

    expect(lowerAST(intent, NimbleProfile)).toEqual(intent);
  });

  it('lowers System Intents inside repetition as a pass-through node', () => {
    const lowered = lowerAST({
      type: 'REPETITION',
      count: 3,
      expression: {
        type: 'NIMBLE_DAMAGE_INTENT',
        baseDice: { count: 1, sides: 6 },
        advantage: false,
        disadvantage: false,
        extraDice: 1,
      },
    }, NimbleProfile);

    expect(lowered).toMatchObject({
      type: 'REPETITION',
      count: 3,
      expression: {
        type: 'GROUPED_POOL',
        intent: 'nimble-damage',
        pools: [{ type: 'DICE_POOL', provenance: { intent: 'nimble-damage', role: 'primary' } }],
      },
    });
  });

  it('recurses into BINARY_OP operands', () => {
    const intent: NimbleDamageIntentNode = {
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 1, sides: 6 },
      advantage: false,
      disadvantage: false,
      extraDice: 1,
    };
    const ast = {
      type: 'BINARY_OP' as const,
      operator: '+' as const,
      left: intent,
      right: { type: 'LITERAL' as const, value: 5 },
    };

    const lowered = lowerAST(ast, NimbleProfile);
    expect(lowered).toEqual({
      type: 'BINARY_OP',
      operator: '+',
      left: {
        type: 'GROUPED_POOL',
        intent: 'nimble-damage',
        pools: [
          {
            type: 'DICE_POOL',
            count: 1,
            sides: 6,
            modifiers: [{ type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true }],
            provenance: { intent: 'nimble-damage', role: 'primary' },
          },
        ],
      },
      right: { type: 'LITERAL', value: 5 },
    });
  });
});
