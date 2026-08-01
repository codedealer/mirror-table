import type { ASTNode, DiceParseError } from '~/models/Dice';
import { SyntaxError as DiceGrammarSyntaxError, parse } from './dice-grammar.gen.js';

const createDiceParseError = (expression: string, cause: unknown): DiceParseError => {
  const message = cause instanceof Error ? cause.message : 'Invalid dice expression';
  const error = new Error(message) as DiceParseError;
  error.code = 'DICE_PARSE_ERROR';
  error.expression = expression;
  return error;
};

// Parses a dice notation string into an AST. Always recognizes every System Intent
// syntax (Nimble's `nd`, D&D 5e's `NdXaM`/`NdXdM`) regardless of the active profile - see §2.1.
export const parseDiceExpression = (expression: string): ASTNode => {
  try {
    return parse(expression) as ASTNode;
  } catch (err) {
    if (err instanceof DiceGrammarSyntaxError || err instanceof Error) {
      throw createDiceParseError(expression, err);
    }
    throw createDiceParseError(expression, undefined);
  }
};
