import type {
  ASTNode,
  DiceModifier,
  DicePoolNode,
  GroupedPoolNode,
  KeepDropModifier,
  SystemProfile,
} from '~/models/Dice';

export const NimbleProfile: SystemProfile = {
  name: 'nimble5e',
  lowerAST: (node: ASTNode): ASTNode => {
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
      primaryModifiers.push({ type: 'EXPLODE', condition: 'MAX', compounding: false });

      const primaryPool: DicePoolNode = {
        type: 'DICE_POOL',
        count: stacked ? 1 + extraDice : 1,
        sides,
        modifiers: primaryModifiers,
      };

      // 2. Secondary Dice Pool (Standard dice, no explosions)
      const pools: DicePoolNode[] = [primaryPool];
      if (remainingCount > 0) {
        pools.push({
          type: 'DICE_POOL',
          count: remainingCount,
          sides,
          modifiers: [],
        });
      }

      const groupedNode: GroupedPoolNode = {
        type: 'GROUPED_POOL',
        pools,
      };

      if (!node.flatModifier)
        return groupedNode;

      return {
        type: 'BINARY_OP',
        operator: '+',
        left: groupedNode,
        right: { type: 'LITERAL', value: node.flatModifier },
      };
    }

    return node;
  },
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
      };
    }

    return node;
  },
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
