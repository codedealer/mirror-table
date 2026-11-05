// TTRPG dice engine AST, modifier, output-schema, RNG, and error types.
// See .github/20260730_dice_roller/PLAN.md for the full specification.

// --- Primitive AST Nodes ---

export type ASTNode =
  | LiteralNode
  | DicePoolNode
  | GroupedPoolNode
  | BinaryOpNode
  | RepetitionNode
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

/** Repeats one explicitly parenthesized expression as independent evaluations. */
export interface RepetitionNode {
  type: 'REPETITION';
  expression: ASTNode;
  count: number;
}

export const MAX_DICE_REPETITIONS = 10_000;

export interface DicePoolNode {
  type: 'DICE_POOL';
  count: number;
  sides: number;
  modifiers: DiceModifier[];
  /** Semantic origin retained when a System Intent lowers into primitive pools. */
  provenance?: PoolProvenance;
}

export interface PoolProvenance {
  intent: 'nimble-damage' | 'dnd5e-advantage';
  role?: 'primary' | 'extra';
}

export interface GroupedPoolNode {
  type: 'GROUPED_POOL';
  pools: DicePoolNode[];
  /** Metadata for a lowered Nimble System Intent, including its attached modifier. */
  intent?: 'nimble-damage';
  flatModifier?: number;
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
  /** Compare settled values (including bumps) to the die maximum. */
  settledMaximum?: boolean;
}

export interface RerollModifier {
  type: 'REROLL';
  condition: 'EXACT' | 'LESS_EQUAL';
  threshold: number;
  once: boolean; // ro vs r
  targetDieIndex?: number; // Optional positional targeting via `[N]` (0-based)
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
  extraDice: number; // M, defaults to 1 at parse time; only meaningful when advantage/disadvantage stacks
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

export type DieEvaluationEvent =
  | { type: 'ROLLED'; value: number }
  | { type: 'KEPT' | 'DROPPED' }
  | { type: 'BUMPED'; amount: number; from: number; to: number }
  | { type: 'REROLLED'; from: number; to: number }
  | { type: 'EXPLODED'; value: number; generatedDieId?: number }
  | { type: 'ADDED_BY_EXPLOSION'; sourceDieId?: number };

export interface DieResult {
  sides: number;
  rawRoll: number;
  finalValue: number;
  /** Stable within one evaluation; generated dice retain their triggering die identity. */
  id?: number;
  initialRoll?: number;
  rerollHistory?: number[];
  bumpAmount?: number;
  generatedBy?: number;
  events?: DieEvaluationEvent[];
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
  id?: number;
  provenance?: PoolProvenance;
  capped?: boolean;
}

export type EvaluationTraceNode =
  | { type: 'LITERAL'; value: number }
  | { type: 'REPETITION'; repetitions: EvaluationTraceNode[]; count: number; value: number }
  | {
    type: 'POOL';
    poolId: number;
    sides: number;
    provenance?: PoolProvenance;
    subtotal: number;
    capped: boolean;
    dice: Array<{
      dieId: number;
      sides: number;
      initialRoll: number;
      rerolls: number[];
      finalValue: number;
      dropped: boolean;
      capped: boolean;
      bumpAmount: number;
      exploded: boolean;
      generatedBy?: number;
      events: DieEvaluationEvent[];
    }>;
  }
  | {
    type: 'GROUPED_POOL';
    pools: EvaluationTraceNode[];
    value: number;
    intent?: 'nimble-damage';
    flatModifier?: number;
    voided?: boolean;
    preVoidValue?: number;
  }
  | {
    type: 'ARITHMETIC';
    operator: BinaryOpNode['operator'];
    left: EvaluationTraceNode;
    right: EvaluationTraceNode;
    leftValue: number;
    rightValue: number;
    value: number;
  };

export interface NaturalHint {
  kind: 'minimum' | 'maximum';
  face: number;
  sides: number;
  dieId: number;
  poolId: number;
  context: string;
}

export interface RollEvaluationResult {
  expression: string;
  total: number;
  breakdown: PoolExecutionResult[];
  trace: EvaluationTraceNode;
  naturalHints: NaturalHint[];
  ast: ASTNode; // Standard lowered AST
  capped: boolean; // true if any die anywhere in the roll hit a safety cap (see §4.6)
}

// --- RNG Dependency Injection ---

// Async so a real network-backed RNG (random.org) can be substituted (see ADR 0001).
export type RandomGenerator = (min: number, max: number) => Promise<number>;

// --- Dice roller saved macros ---

export type DiceProfileId = 'none' | 'nimble5e' | 'dnd5e';

export interface DiceRollerMacro {
  id: string;
  expression: string;
  profileId: DiceProfileId;
  label?: string;
  createdAt: number;
  lastUsedAt?: number;
}

export const MAX_SAVED_DICE_MACROS = 20;
export const MAX_DICE_MACRO_EXPRESSION_LENGTH = 256;
export const MAX_DICE_MACRO_LABEL_LENGTH = 48;

// --- System Profiles ---

export interface SystemProfile {
  name: string;
  lowerAST: (node: ASTNode) => ASTNode;
  detectNaturals?: (trace: EvaluationTraceNode) => NaturalHint[];
  /** Profile-owned policy for voiding an eligible intent group. */
  detectCriticalMiss?: (trace: EvaluationTraceNode) => boolean;
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
