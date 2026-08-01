import { describe, expect, it } from 'vitest';
import { isDiceParseError } from '~/models/Dice';
import { parseDiceExpression } from './dice-parser';

describe('parseDiceExpression', () => {
  it('parses a basic dice pool with keep-highest', () => {
    expect(parseDiceExpression('4d6kh3')).toEqual({
      type: 'DICE_POOL',
      count: 4,
      sides: 6,
      modifiers: [{ type: 'KEEP', target: 'HIGHEST', count: 3 }],
    });
  });

  it('parses reroll-less-equal', () => {
    expect(parseDiceExpression('1d20r<=2')).toEqual({
      type: 'DICE_POOL',
      count: 1,
      sides: 20,
      modifiers: [{ type: 'REROLL', condition: 'LESS_EQUAL', threshold: 2, once: false }],
    });
  });

  it('parses a basic exploding pool', () => {
    expect(parseDiceExpression('3d6!')).toEqual({
      type: 'DICE_POOL',
      count: 3,
      sides: 6,
      modifiers: [{ type: 'EXPLODE', condition: 'MAX', compounding: false }],
    });
  });

  it('parses a grouped pool', () => {
    expect(parseDiceExpression('{1d6!, 2d6}')).toEqual({
      type: 'GROUPED_POOL',
      pools: [
        { type: 'DICE_POOL', count: 1, sides: 6, modifiers: [{ type: 'EXPLODE', condition: 'MAX', compounding: false }] },
        { type: 'DICE_POOL', count: 2, sides: 6, modifiers: [] },
      ],
    });
  });

  it('parses the Nimble damage shorthand with advantage and a flat modifier', () => {
    expect(parseDiceExpression('nd 2d6a + 2')).toEqual({
      type: 'NIMBLE_DAMAGE_INTENT',
      baseDice: { count: 2, sides: 6 },
      advantage: true,
      disadvantage: false,
      flatModifier: 2,
    });
  });

  it('parses the dnd5e advantage shorthand with an explicit extraDice count', () => {
    expect(parseDiceExpression('2d20a2')).toEqual({
      type: 'ADVANTAGE_DISADVANTAGE_INTENT',
      baseDice: { count: 2, sides: 20 },
      mode: 'ADVANTAGE',
      extraDice: 2,
    });
  });

  it('defaults extraDice to 1 when omitted', () => {
    expect(parseDiceExpression('1d20a')).toEqual({
      type: 'ADVANTAGE_DISADVANTAGE_INTENT',
      baseDice: { count: 1, sides: 20 },
      mode: 'ADVANTAGE',
      extraDice: 1,
    });
  });

  it('does not confuse a drop modifier with the disadvantage shorthand', () => {
    expect(parseDiceExpression('4d6dl1')).toEqual({
      type: 'DICE_POOL',
      count: 4,
      sides: 6,
      modifiers: [{ type: 'DROP', target: 'LOWEST', count: 1 }],
    });
  });

  it('respects standard PEMDAS precedence with arithmetic grouping', () => {
    expect(parseDiceExpression('(1d6+2)*3')).toEqual({
      type: 'BINARY_OP',
      operator: '*',
      left: {
        type: 'BINARY_OP',
        operator: '+',
        left: { type: 'DICE_POOL', count: 1, sides: 6, modifiers: [] },
        right: { type: 'LITERAL', value: 2 },
      },
      right: { type: 'LITERAL', value: 3 },
    });
  });

  it('forces standard primitive parsing via the std: escape hatch', () => {
    expect(parseDiceExpression('std: 4d6kh3')).toEqual(parseDiceExpression('4d6kh3'));
  });

  it('throws a DiceParseError for invalid syntax', () => {
    try {
      parseDiceExpression('not a dice expression');
      expect.unreachable('expected parseDiceExpression to throw');
    } catch (err) {
      expect(isDiceParseError(err)).toBe(true);
    }
  });
});
