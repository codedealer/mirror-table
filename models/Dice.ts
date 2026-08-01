// TTRPG dice engine AST, modifier, output-schema, RNG, and error types.
// See .github/20260730_dice_roller/PLAN.md for the full specification.

// --- Primitive AST Nodes ---

export type ASTNode =
  | LiteralNode
  | DicePoolNode
  | GroupedPoolNode
  | BinaryOpNode
  | NimbleDamageIntentNode // High-level intent node (Nimble profile)
  | AdvantageDisadvantageIntentNode; // High-level intent node (dnd5e profile)

export interface LiteralNode {
  type: 'LITERAL';
  value: number;
}

export interface BinaryOpNode {
  type: 'BINARY_OP';
  operator: '+' | '-' | '*' | '/' | '%';
  left: ASTNode;
  right: ASTNode;
}

export interface DicePoolNode {
  type: 'DICE_POOL';
  count: number;
  sides: number;
  modifiers: DiceModifier[];
}

export interface GroupedPoolNode {
  type: 'GROUPED_POOL';
  pools: DicePoolNode[];
}

// --- Modifier Specifications ---

export type DiceModifier =
  | KeepDropModifier
  | ExplodeModifier
  | RerollModifier
  | ValueBumpModifier;

export interface KeepDropModifier {
  type: 'KEEP' | 'DROP';
  target: 'HIGHEST' | 'LOWEST';
  count: number;
}

export interface ExplodeModifier {
  type: 'EXPLODE';
  condition: 'MAX' | 'EXACT' | 'GREATER_EQUAL' | 'LESS_EQUAL';
  threshold?: number;
  compounding: boolean; // true for !!
  targetDieIndex?: number; // Optional positional targeting (e.g., 0 for Primary)
}

export interface RerollModifier {
  type: 'REROLL';
  condition: 'EXACT' | 'LESS_EQUAL';
  threshold: number;
  once: boolean; // ro vs r
}

export interface ValueBumpModifier {
  type: 'VALUE_BUMP';
  amount: number; // e.g., +1 bump
  clampAtMax: boolean; // Capped at die face limit (Nimble mechanic)
}

// --- System Intent Nodes ---

export interface NimbleDamageIntentNode {
  type: 'NIMBLE_DAMAGE_INTENT';
  baseDice: { count: number; sides: number };
  advantage: boolean;
  disadvantage: boolean;
  flatModifier?: number;
}

// NdXaM / NdXdM - D&D 5e advantage/disadvantage shorthand (dnd5e profile only)
export interface AdvantageDisadvantageIntentNode {
  type: 'ADVANTAGE_DISADVANTAGE_INTENT';
  baseDice: { count: number; sides: number };
  mode: 'ADVANTAGE' | 'DISADVANTAGE';
  extraDice: number; // M, defaults to 1 at parse time
}

// --- Output Schema ---

export interface DieResult {
  sides: number;
  rawRoll: number;
  finalValue: number;
  flags: {
    dropped?: boolean;
    exploded?: boolean;
    rerolled?: boolean;
    bumped?: boolean;
    capped?: boolean; // true when the 100-iteration reroll/explosion cap was hit on this die
  };
}

export interface PoolExecutionResult {
  dice: DieResult[];
  subtotal: number;
}

export interface RollEvaluationResult {
  expression: string;
  total: number;
  breakdown: PoolExecutionResult[];
  ast: ASTNode; // Standard lowered AST
  capped: boolean; // true if any die anywhere in the roll hit a safety cap (see §4.6)
}

// --- RNG Dependency Injection ---

// Async so a real network-backed RNG (random.org) can be substituted (see ADR 0001).
export type RandomGenerator = (min: number, max: number) => Promise<number>;

// --- System Profiles ---

export interface SystemProfile {
  name: string;
  lowerAST: (node: ASTNode) => ASTNode;
}

// --- Errors ---

const isObject = (obj: unknown): obj is Record<string, unknown> => {
  return !!obj && typeof obj === 'object';
};

export interface DiceParseError extends Error {
  code: 'DICE_PARSE_ERROR';
  expression: string;
}

export const isDiceParseError = (err: unknown): err is DiceParseError => {
  return isObject(err) && 'code' in err && err.code === 'DICE_PARSE_ERROR';
};

export interface DiceProfileRequiredError extends Error {
  code: 'DICE_PROFILE_REQUIRED_ERROR';
  requiredProfile: string;
}

export const isDiceProfileRequiredError = (err: unknown): err is DiceProfileRequiredError => {
  return isObject(err) && 'code' in err && err.code === 'DICE_PROFILE_REQUIRED_ERROR';
};
