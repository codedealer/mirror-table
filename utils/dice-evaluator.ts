import type {
  ASTNode,
  DiceModifier,
  DicePoolNode,
  DiceProfileRequiredError,
  DieResult,
  ExplodeModifier,
  PoolExecutionResult,
  RandomGenerator,
  RerollModifier,
  RollEvaluationResult,
  SystemProfile,
} from '~/models/Dice';
import { lowerAST } from './dice-lowering';
import { parseDiceExpression } from './dice-parser';

// Safety limits (see §4.6): hitting either cap flags the affected die/pool as
// `capped: true` and the roll still completes - it never throws.
const MAX_ITERATIONS_PER_DIE = 100;
const MAX_TOTAL_DICE = 10_000;

interface EvaluationContext {
  rng: RandomGenerator;
  totalDiceRolled: number;
  anyCapped: boolean;
}

const createProfileRequiredError = (requiredProfile: string): DiceProfileRequiredError => {
  const error = new Error(`Evaluating this expression requires the "${requiredProfile}" system profile to be active`) as DiceProfileRequiredError;
  error.code = 'DICE_PROFILE_REQUIRED_ERROR';
  error.requiredProfile = requiredProfile;
  return error;
};

const rollDie = async (ctx: EvaluationContext, sides: number): Promise<number> => {
  ctx.totalDiceRolled += 1;
  return ctx.rng(1, sides);
};

const hasDiceBudget = (ctx: EvaluationContext): boolean => {
  if (ctx.totalDiceRolled >= MAX_TOTAL_DICE) {
    ctx.anyCapped = true;
    return false;
  }
  return true;
};

// --- Pipeline phase 2: Filtering (Keep/Drop) ---

const applyKeepDrop = (dice: DieResult[], modifiers: DiceModifier[]): void => {
  for (const mod of modifiers) {
    if (mod.type !== 'KEEP' && mod.type !== 'DROP')
      continue;

    const active = dice
      .map((die, index) => ({ die, index }))
      .filter(({ die }) => !die.flags.dropped);
    const ascending = [...active].sort((a, b) => a.die.rawRoll - b.die.rawRoll);

    let toDrop: typeof active;
    if (mod.type === 'KEEP') {
      const keepCount = Math.min(mod.count, ascending.length);
      const keep = mod.target === 'HIGHEST'
        ? ascending.slice(ascending.length - keepCount)
        : ascending.slice(0, keepCount);
      const keepIndices = new Set(keep.map(({ index }) => index));
      toDrop = active.filter(({ index }) => !keepIndices.has(index));
    } else {
      const dropCount = Math.min(mod.count, ascending.length);
      toDrop = mod.target === 'HIGHEST'
        ? ascending.slice(ascending.length - dropCount)
        : ascending.slice(0, dropCount);
    }

    for (const { die } of toDrop) {
      die.flags.dropped = true;
    }
  }
};

// --- Pipeline phase 3: Value Transformations ---

const applyValueBumps = (dice: DieResult[], modifiers: DiceModifier[]): void => {
  for (const mod of modifiers) {
    if (mod.type !== 'VALUE_BUMP')
      continue;

    for (const die of dice) {
      if (die.flags.dropped)
        continue;
      const bumped = die.finalValue + mod.amount;
      die.finalValue = mod.clampAtMax ? Math.min(bumped, die.sides) : bumped;
      die.flags.bumped = true;
    }
  }
};

// --- Pipeline phase 4: Rerolls ---

const matchesRerollCondition = (mod: RerollModifier, value: number): boolean => {
  return mod.condition === 'LESS_EQUAL' ? value <= mod.threshold : value === mod.threshold;
};

const applyRerolls = async (
  dice: DieResult[],
  modifiers: DiceModifier[],
  sides: number,
  ctx: EvaluationContext,
): Promise<void> => {
  const rerollMods = modifiers.filter((mod): mod is RerollModifier => mod.type === 'REROLL');
  if (!rerollMods.length)
    return;

  for (const die of dice) {
    if (die.flags.dropped)
      continue;

    for (const mod of rerollMods) {
      let iterations = 0;
      while (matchesRerollCondition(mod, die.finalValue) && iterations < MAX_ITERATIONS_PER_DIE) {
        if (!hasDiceBudget(ctx))
          break;
        die.finalValue = await rollDie(ctx, sides);
        die.rawRoll = die.finalValue;
        die.flags.rerolled = true;
        iterations += 1;
        if (mod.once)
          break;
      }
      if (iterations >= MAX_ITERATIONS_PER_DIE) {
        die.flags.capped = true;
        ctx.anyCapped = true;
      }
    }
  }
};

// --- Pipeline phase 5: Explosions ---

const matchesExplodeCondition = (mod: ExplodeModifier, value: number, sides: number): boolean => {
  switch (mod.condition) {
    case 'MAX': return value === sides;
    case 'EXACT': return value === mod.threshold;
    case 'GREATER_EQUAL': return value >= (mod.threshold ?? sides);
    case 'LESS_EQUAL': return value <= (mod.threshold ?? sides);
    default: return false;
  }
};

// Explodes `die`'s chain, checking each freshly rolled value (not the accumulated
// compounding total) so cascading explosions terminate correctly.
const explodeChain = async (
  die: DieResult,
  mod: ExplodeModifier,
  sides: number,
  ctx: EvaluationContext,
  allDice: DieResult[],
): Promise<void> => {
  let iterations = 0;
  let valueToCheck = die.finalValue;

  while (matchesExplodeCondition(mod, valueToCheck, sides) && iterations < MAX_ITERATIONS_PER_DIE) {
    if (!hasDiceBudget(ctx))
      break;
    const newRoll = await rollDie(ctx, sides);
    iterations += 1;
    die.flags.exploded = true;

    if (mod.compounding) {
      die.finalValue += newRoll;
    } else {
      allDice.push({ sides, rawRoll: newRoll, finalValue: newRoll, flags: {} });
    }
    valueToCheck = newRoll;
  }

  if (iterations >= MAX_ITERATIONS_PER_DIE) {
    die.flags.capped = true;
    ctx.anyCapped = true;
  }
};

const applyExplosions = async (
  dice: DieResult[],
  modifiers: DiceModifier[],
  sides: number,
  ctx: EvaluationContext,
): Promise<void> => {
  const explodeMods = modifiers.filter((mod): mod is ExplodeModifier => mod.type === 'EXPLODE');
  if (!explodeMods.length)
    return;

  for (const mod of explodeMods) {
    // Snapshot the pool before this modifier runs - dice pushed by explosions must
    // not be re-visited as fresh "targets" by this same modifier's outer loop.
    const survivors = dice.filter(die => !die.flags.dropped);
    // Positional targeting (`!p`/`!1`) resolves against surviving dice in original
    // order, not the raw original array index - a dropped die can never be targeted,
    // and combining `!p` with `kh`/`dl` in the same pool targets the correct survivor.
    const targets = typeof mod.targetDieIndex === 'number'
      ? [survivors[mod.targetDieIndex]].filter((die): die is DieResult => !!die)
      : survivors;

    for (const die of targets) {
      await explodeChain(die, mod, sides, ctx, dice);
    }
  }
};

// --- Pool evaluation (§4 pipeline) ---

const evaluatePool = async (pool: DicePoolNode, ctx: EvaluationContext): Promise<PoolExecutionResult> => {
  const dice: DieResult[] = [];

  // 1. Initial Generation
  for (let i = 0; i < pool.count; i++) {
    if (!hasDiceBudget(ctx))
      break;
    const raw = await rollDie(ctx, pool.sides);
    dice.push({ sides: pool.sides, rawRoll: raw, finalValue: raw, flags: {} });
  }

  // 2. Filtering (Keep/Drop)
  applyKeepDrop(dice, pool.modifiers);
  // 3. Value Transformations
  applyValueBumps(dice, pool.modifiers);
  // 4. Rerolls
  await applyRerolls(dice, pool.modifiers, pool.sides, ctx);
  // 5. Explosions
  await applyExplosions(dice, pool.modifiers, pool.sides, ctx);

  // 6. Aggregation
  const subtotal = dice
    .filter(die => !die.flags.dropped)
    .reduce((sum, die) => sum + die.finalValue, 0);

  return { dice, subtotal };
};

interface NodeEvaluation {
  value: number;
  breakdown: PoolExecutionResult[];
}

const applyOperator = (operator: '+' | '-' | '*' | '/' | '%', left: number, right: number): number => {
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '%': return left % right;
  }
};

const evaluateNode = async (node: ASTNode, ctx: EvaluationContext): Promise<NodeEvaluation> => {
  switch (node.type) {
    case 'LITERAL':
      return { value: node.value, breakdown: [] };

    case 'BINARY_OP': {
      const left = await evaluateNode(node.left, ctx);
      const right = await evaluateNode(node.right, ctx);
      return {
        value: applyOperator(node.operator, left.value, right.value),
        breakdown: [...left.breakdown, ...right.breakdown],
      };
    }

    case 'DICE_POOL': {
      const result = await evaluatePool(node, ctx);
      return { value: result.subtotal, breakdown: [result] };
    }

    case 'GROUPED_POOL': {
      const breakdown: PoolExecutionResult[] = [];
      let value = 0;
      for (const pool of node.pools) {
        const result = await evaluatePool(pool, ctx);
        breakdown.push(result);
        value += result.subtotal;
      }
      return { value, breakdown };
    }

    case 'NIMBLE_DAMAGE_INTENT':
      throw createProfileRequiredError('nimble5e');

    case 'ADVANTAGE_DISADVANTAGE_INTENT':
      throw createProfileRequiredError('dnd5e');
  }
};

export const evaluateAST = async (
  ast: ASTNode,
  rng: RandomGenerator,
  expression = '',
): Promise<RollEvaluationResult> => {
  const ctx: EvaluationContext = { rng, totalDiceRolled: 0, anyCapped: false };
  const { value, breakdown } = await evaluateNode(ast, ctx);
  const anyDieCapped = breakdown.some(pool => pool.dice.some(die => die.flags.capped));

  return {
    expression,
    total: value,
    breakdown,
    ast,
    capped: ctx.anyCapped || anyDieCapped,
  };
};

// Convenience entry point: parse -> lower (if a profile is active) -> evaluate.
export const evaluateDiceExpression = async (
  expression: string,
  rng: RandomGenerator,
  profile?: SystemProfile,
): Promise<RollEvaluationResult> => {
  const rawAST = parseDiceExpression(expression);
  const lowered = lowerAST(rawAST, profile);
  return evaluateAST(lowered, rng, expression);
};
