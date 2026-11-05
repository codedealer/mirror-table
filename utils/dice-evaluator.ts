import type {
  ASTNode,
  DiceModifier,
  DicePoolNode,
  DiceProfileRequiredError,
  DieResult,
  EvaluationTraceNode,
  ExplodeModifier,
  PoolExecutionResult,
  RandomGenerator,
  RerollModifier,
  RollEvaluationResult,
  SystemProfile,
} from '~/models/Dice';
import { MAX_DICE_REPETITIONS } from '~/models/Dice';
import { lowerAST } from './dice-lowering';
import { parseDiceExpression } from './dice-parser';

// Safety limits (see §4.6): hitting either cap flags the affected die/pool as
// `capped: true` and the roll still completes - it never throws.
const MAX_ITERATIONS_PER_DIE = 100;
const MAX_TOTAL_DICE = 10_000;

interface EvaluationContext {
  rng: RandomGenerator;
  totalDiceRolled: number;
  totalRepetitionsEvaluated: number;
  nextDieId: number;
  nextPoolId: number;
  anyCapped: boolean;
  capEvents: number;
  profile?: SystemProfile;
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
    ctx.capEvents += 1;
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

    const dropped = new Set(toDrop.map(({ index }) => index));
    for (const { die, index } of active) {
      if (dropped.has(index))
        die.flags.dropped = true;
      die.events ??= [];
      die.events.push({ type: dropped.has(index) ? 'DROPPED' : 'KEPT' });
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
      const from = die.finalValue;
      const bumped = from + mod.amount;
      // Value Bumps are uncapped; clampAtMax is retained in the parsed legacy schema only.
      die.finalValue = bumped;
      die.bumpAmount = (die.bumpAmount ?? 0) + (die.finalValue - from);
      die.events ??= [];
      die.events.push({ type: 'BUMPED', amount: die.finalValue - from, from, to: die.finalValue });
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

  const survivors = dice.filter(die => !die.flags.dropped);

  for (const mod of rerollMods) {
    // Positional targeting (`[N]`) resolves against surviving dice in original order,
    // same as explode's positional targeting - a dropped die can never be targeted.
    const targets = typeof mod.targetDieIndex === 'number'
      ? [survivors[mod.targetDieIndex]].filter((die): die is DieResult => !!die)
      : survivors;

    for (const die of targets) {
      let iterations = 0;
      while (matchesRerollCondition(mod, die.finalValue) && iterations < MAX_ITERATIONS_PER_DIE) {
        if (!hasDiceBudget(ctx))
          break;
        const from = die.finalValue;
        die.finalValue = await rollDie(ctx, sides);
        die.rawRoll = die.finalValue;
        die.events ??= [];
        die.events.push({ type: 'REROLLED', from, to: die.finalValue });
        die.rerollHistory ??= [];
        die.rerollHistory.push(die.finalValue);
        die.flags.rerolled = true;
        iterations += 1;
        if (mod.once)
          break;
      }
      if (iterations >= MAX_ITERATIONS_PER_DIE) {
        die.flags.capped = true;
        ctx.anyCapped = true;
        ctx.capEvents += 1;
      }
    }
  }
};

// --- Pipeline phase 5: Explosions ---

const matchesExplodeCondition = (mod: ExplodeModifier, value: number, sides: number): boolean => {
  switch (mod.condition) {
    case 'MAX': return mod.settledMaximum ? value >= sides : value === sides;
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
  let chainDie = die;

  while (matchesExplodeCondition(mod, valueToCheck, sides) && iterations < MAX_ITERATIONS_PER_DIE) {
    if (!hasDiceBudget(ctx))
      break;
    const newRoll = await rollDie(ctx, sides);
    iterations += 1;
    chainDie.flags.exploded = true;

    let generatedDieId: number | undefined;
    if (mod.compounding) {
      die.finalValue += newRoll;
    } else {
      generatedDieId = ctx.nextDieId++;
      const generatedDie: DieResult = {
        id: generatedDieId,
        sides,
        rawRoll: newRoll,
        initialRoll: newRoll,
        finalValue: newRoll,
        generatedBy: die.id,
        events: [{ type: 'ROLLED', value: newRoll }, { type: 'ADDED_BY_EXPLOSION', sourceDieId: die.id }],
        flags: {},
      };
      allDice.push(generatedDie);
      chainDie = generatedDie;
    }
    die.events ??= [];
    die.events.push({ type: 'EXPLODED', value: newRoll, generatedDieId });
    valueToCheck = newRoll;
  }

  if (iterations >= MAX_ITERATIONS_PER_DIE) {
    die.flags.capped = true;
    ctx.anyCapped = true;
    ctx.capEvents += 1;
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
    // Positional targeting (`!p`/`![N]`) resolves against surviving dice in original
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
  const capEventsBefore = ctx.capEvents;

  // 1. Initial Generation
  for (let i = 0; i < pool.count; i++) {
    if (!hasDiceBudget(ctx))
      break;
    const raw = await rollDie(ctx, pool.sides);
    dice.push({
      id: ctx.nextDieId++,
      sides: pool.sides,
      rawRoll: raw,
      initialRoll: raw,
      finalValue: raw,
      events: [{ type: 'ROLLED', value: raw }],
      flags: {},
    });
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

  return {
    id: ctx.nextPoolId++,
    provenance: pool.provenance,
    dice,
    subtotal,
    capped: ctx.capEvents > capEventsBefore || dice.some(die => die.flags.capped),
  };
};

interface NodeEvaluation {
  value: number;
  breakdown: PoolExecutionResult[];
  trace: EvaluationTraceNode;
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
      return { value: node.value, breakdown: [], trace: { type: 'LITERAL', value: node.value } };

    case 'REPETITION': {
      if (!Number.isInteger(node.count) || node.count < 1 || node.count > MAX_DICE_REPETITIONS)
        throw new RangeError(`Repetition count must be between 1 and ${MAX_DICE_REPETITIONS}`);

      const repetitions: EvaluationTraceNode[] = [];
      const breakdown: PoolExecutionResult[] = [];
      let value = 0;
      for (let index = 0; index < node.count; index++) {
        if (ctx.totalRepetitionsEvaluated >= MAX_DICE_REPETITIONS)
          throw new RangeError(`Total repetition evaluations cannot exceed ${MAX_DICE_REPETITIONS}`);
        ctx.totalRepetitionsEvaluated += 1;
        const repetition = await evaluateNode(node.expression, ctx);
        repetitions.push(repetition.trace);
        breakdown.push(...repetition.breakdown);
        value += repetition.value;
      }
      return {
        value,
        breakdown,
        trace: { type: 'REPETITION', repetitions, count: node.count, value },
      };
    }

    case 'BINARY_OP': {
      const left = await evaluateNode(node.left, ctx);
      const right = await evaluateNode(node.right, ctx);
      const value = applyOperator(node.operator, left.value, right.value);
      return {
        value,
        breakdown: [...left.breakdown, ...right.breakdown],
        trace: {
          type: 'ARITHMETIC',
          operator: node.operator,
          left: left.trace,
          right: right.trace,
          leftValue: left.value,
          rightValue: right.value,
          value,
        },
      };
    }

    case 'DICE_POOL': {
      const result = await evaluatePool(node, ctx);
      const poolId = result.id!;
      const trace: EvaluationTraceNode = {
        type: 'POOL',
        poolId,
        sides: node.sides,
        provenance: node.provenance,
        subtotal: result.subtotal,
        capped: Boolean(result.capped),
        dice: result.dice.map((die) => {
          const dieId = die.id!;
          return {
            dieId,
            sides: die.sides,
            initialRoll: die.initialRoll ?? die.rawRoll,
            rerolls: die.rerollHistory ?? [],
            finalValue: die.finalValue,
            dropped: Boolean(die.flags.dropped),
            capped: Boolean(die.flags.capped),
            bumpAmount: die.bumpAmount ?? 0,
            exploded: Boolean(die.flags.exploded),
            generatedBy: die.generatedBy,
            events: die.events ?? [],
          };
        }),
      };
      return { value: result.subtotal, breakdown: [result], trace };
    }

    case 'GROUPED_POOL': {
      const breakdown: PoolExecutionResult[] = [];
      const pools: EvaluationTraceNode[] = [];
      let value = 0;
      for (const pool of node.pools) {
        const result = await evaluateNode(pool, ctx);
        breakdown.push(...result.breakdown);
        pools.push(result.trace);
        value += result.value;
      }
      if (node.flatModifier !== undefined)
        value += node.flatModifier;

      const groupTrace: EvaluationTraceNode = {
        type: 'GROUPED_POOL',
        pools,
        value,
        intent: node.intent,
        flatModifier: node.flatModifier,
      };
      if (node.intent && ctx.profile?.detectCriticalMiss?.(groupTrace)) {
        return {
          value: 0,
          breakdown,
          trace: { ...groupTrace, value: 0, voided: true, preVoidValue: value },
        };
      }
      return { value, breakdown, trace: groupTrace };
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
  profile?: SystemProfile,
): Promise<RollEvaluationResult> => {
  const ctx: EvaluationContext = { rng, totalDiceRolled: 0, totalRepetitionsEvaluated: 0, nextDieId: 1, nextPoolId: 1, anyCapped: false, capEvents: 0, profile };
  const { value, breakdown, trace } = await evaluateNode(ast, ctx);
  const anyDieCapped = breakdown.some(pool => pool.dice.some(die => die.flags.capped));

  return {
    expression,
    total: value,
    breakdown,
    trace,
    naturalHints: profile?.detectNaturals?.(trace) ?? [],
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
  return evaluateAST(lowered, rng, expression, profile);
};
