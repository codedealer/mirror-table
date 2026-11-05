import type {
  ASTNode,
  DiceModifier,
  DicePoolNode,
  EvaluationTraceNode,
  GroupedPoolNode,
  KeepDropModifier,
  NaturalHint,
  SystemProfile,
} from '~/models/Dice';

const lowerNimbleAST = (node: ASTNode): ASTNode => {
  if (node.type === 'NIMBLE_DAMAGE_INTENT') {
    const { count, sides } = node.baseDice;
    const { extraDice } = node;
    const stacked = node.advantage || node.disadvantage;
    const remainingCount = count - 1;

    // 1. Primary Die Pool (Explodes on MAX, handles Advantage/Disadvantage stacking of M extra dice)
    const primaryModifiers: DiceModifier[] = [];
    if (node.advantage) {
      primaryModifiers.push({ type: 'DROP', target: 'LOWEST', count: extraDice });
    } else if (node.disadvantage) {
      primaryModifiers.push({ type: 'DROP', target: 'HIGHEST', count: extraDice });
    }
    primaryModifiers.push({ type: 'EXPLODE', condition: 'MAX', compounding: false, settledMaximum: true });

    const primaryPool: DicePoolNode = {
      type: 'DICE_POOL',
      count: stacked ? 1 + extraDice : 1,
      sides,
      modifiers: primaryModifiers,
      provenance: { intent: 'nimble-damage', role: 'primary' },
    };

    // 2. Secondary Dice Pool (Standard dice, no explosions)
    const pools: DicePoolNode[] = [primaryPool];
    if (remainingCount > 0) {
      pools.push({
        type: 'DICE_POOL',
        count: remainingCount,
        sides,
        modifiers: [],
        provenance: { intent: 'nimble-damage', role: 'extra' },
      });
    }

    const groupedNode: GroupedPoolNode = {
      type: 'GROUPED_POOL',
      pools,
    };

    if (!node.flatModifier)
      return { ...groupedNode, intent: 'nimble-damage' };

    return { ...groupedNode, intent: 'nimble-damage', flatModifier: node.flatModifier };
  }

  return node;
};

const tracePools = (trace: EvaluationTraceNode): Extract<EvaluationTraceNode, { type: 'POOL' }>[] => {
  if (trace.type === 'POOL')
    return [trace];
  if (trace.type === 'GROUPED_POOL')
    return trace.pools.flatMap(tracePools);
  if (trace.type === 'REPETITION')
    return trace.repetitions.flatMap(tracePools);
  if (trace.type === 'ARITHMETIC')
    return [...tracePools(trace.left), ...tracePools(trace.right)];
  return [];
};

const finalRolledFace = (die: Extract<EvaluationTraceNode, { type: 'POOL' }>['dice'][number]): number => {
  const reroll = [...die.events].reverse().find(event => event.type === 'REROLLED');
  return reroll?.type === 'REROLLED' ? reroll.to : die.initialRoll;
};

const detectDndNaturals = (trace: EvaluationTraceNode): NaturalHint[] => {
  const hints: NaturalHint[] = [];
  for (const pool of tracePools(trace)) {
    if (pool.sides !== 20)
      continue;
    const survivors = pool.dice.filter(die => die.sides === 20 && !die.dropped);
    if (survivors.length !== 1)
      continue;

    const die = survivors[0];
    const face = finalRolledFace(die);
    if (face !== 1 && face !== 20)
      continue;

    hints.push({
      kind: face === 1 ? 'minimum' : 'maximum',
      face,
      sides: 20,
      dieId: die.dieId,
      poolId: pool.poolId,
      context: pool.provenance?.intent === 'dnd5e-advantage' ? 'D&D advantage/disadvantage pool' : 'd20 roll',
    });
  }
  return hints;
};

const detectNimbleNaturals = (trace: EvaluationTraceNode): NaturalHint[] => {
  const hints: NaturalHint[] = [];
  for (const pool of tracePools(trace)) {
    // A standalone pool's first surviving die is its Primary Die. In lowered Nimble
    // damage, only the explicitly tagged primary pool participates (never extra dice).
    if (pool.provenance?.intent === 'nimble-damage' && pool.provenance.role !== 'primary')
      continue;

    // Only original candidate dice participate in Primary Die selection; Explosion dice
    // are outcomes of that die, not additional candidates for the System Intent.
    const primaryDie = pool.dice.find(die => !die.dropped && die.generatedBy === undefined);
    if (!primaryDie)
      continue;

    const rolledFace = finalRolledFace(primaryDie);
    if (rolledFace === 1) {
      hints.push({
        kind: 'minimum',
        face: rolledFace,
        sides: primaryDie.sides,
        dieId: primaryDie.dieId,
        poolId: pool.poolId,
        context: 'Nimble Primary Die',
      });
    }

    if (primaryDie.finalValue >= primaryDie.sides) {
      hints.push({
        kind: 'maximum',
        face: primaryDie.finalValue,
        sides: primaryDie.sides,
        dieId: primaryDie.dieId,
        poolId: pool.poolId,
        context: 'Nimble Primary Die (settled value)',
      });
    }
  }
  return hints;
};

const detectNimbleCriticalMiss = (trace: EvaluationTraceNode): boolean => {
  if (trace.type !== 'GROUPED_POOL' || trace.intent !== 'nimble-damage')
    return false;

  const primaryPool = trace.pools.find((pool): pool is Extract<EvaluationTraceNode, { type: 'POOL' }> =>
    pool.type === 'POOL' && pool.provenance?.intent === 'nimble-damage' && pool.provenance.role === 'primary');
  const primaryDie = primaryPool?.dice.find(die => !die.dropped && die.generatedBy === undefined);
  return !!primaryDie && finalRolledFace(primaryDie) === 1;
};

export const NimbleProfile: SystemProfile = {
  name: 'nimble5e',
  lowerAST: lowerNimbleAST,
  detectNaturals: detectNimbleNaturals,
  detectCriticalMiss: detectNimbleCriticalMiss,
};

export const Dnd5eProfile: SystemProfile = {
  name: 'dnd5e',
  lowerAST: (node: ASTNode): ASTNode => {
    if (node.type === 'ADVANTAGE_DISADVANTAGE_INTENT') {
      const { count, sides } = node.baseDice;
      const { extraDice, mode } = node;

      const dropModifier: KeepDropModifier = {
        type: 'DROP',
        target: mode === 'ADVANTAGE' ? 'LOWEST' : 'HIGHEST',
        count: extraDice,
      };

      return {
        type: 'DICE_POOL',
        count: count + extraDice,
        sides,
        modifiers: [dropModifier],
        provenance: { intent: 'dnd5e-advantage' },
      };
    }

    return node;
  },
  detectNaturals: detectDndNaturals,
};

// Recursively rewrites every intent node owned by `profile` into primitive AST nodes.
// Nodes belonging to other profiles (or no profile at all) pass through untouched.
export const lowerAST = (node: ASTNode, profile?: SystemProfile): ASTNode => {
  if (!profile)
    return node;

  switch (node.type) {
    case 'BINARY_OP':
      return profile.lowerAST({
        type: 'BINARY_OP',
        operator: node.operator,
        left: lowerAST(node.left, profile),
        right: lowerAST(node.right, profile),
      });
    case 'REPETITION':
      return profile.lowerAST({
        type: 'REPETITION',
        expression: lowerAST(node.expression, profile),
        count: node.count,
      });
    case 'GROUPED_POOL':
      // Pools within a GROUPED_POOL are always primitive DICE_POOL nodes already.
      return profile.lowerAST(node);
    case 'DICE_POOL':
    case 'LITERAL':
      return profile.lowerAST(node);
    case 'NIMBLE_DAMAGE_INTENT':
    case 'ADVANTAGE_DISADVANTAGE_INTENT':
      return profile.lowerAST(node);
    default:
      return node;
  }
};
