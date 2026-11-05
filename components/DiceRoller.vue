<script setup lang="ts">
import type { DiceProfileId, DiceRollerMacro, EvaluationTraceNode, RandomGenerator } from '~/models/Dice';
import { diceProfileOptions, useDiceRoller } from '~/composables/useDiceRoller';
import { canonicalDiceExpression, createDiceRollerMacroAdapter, type DiceRollerMacroAdapter, useDiceRollerMacros } from '~/composables/useDiceRollerMacros';
import { MAX_SAVED_DICE_MACROS } from '~/models/Dice';
import { evaluateDiceExpression } from '~/utils/dice-evaluator';
import { Dnd5eProfile, NimbleProfile } from '~/utils/dice-lowering';
import { parseDiceExpression } from '~/utils/dice-parser';

const props = defineProps<{ macroAdapter?: DiceRollerMacroAdapter }>();

const {
  expression,
  profileId,
  result,
  error,
  rolling,
  history,
  roll,
  showPrevious,
  showNext,
} = useDiceRoller();

// The playground supplies its own in-memory adapter. Every normal roller, including
// development builds, uses the authenticated user store for persistence.
const userStore = props.macroAdapter ? undefined : useUserStore();
const macroAdapter = createDiceRollerMacroAdapter(props.macroAdapter, userStore);
const { macros, error: macroError, saving: macroSaving, save: saveMacro, remove: removeMacro, rename: renameMacro, use: useMacro, reload: reloadMacros, validate: validateMacro, clearError: clearMacroError } = useDiceRollerMacros(macroAdapter);

// Component-level alerts would break the floating-panel layout, so failures are
// surfaced as auto-dismissing toasts through the shared notification store.
const notificationStore = useNotificationStore();

watch(macroError, (message) => {
  if (!message)
    return;
  notificationStore.error(message);
  // Clear composable state so the same failure can fire a fresh toast later.
  clearMacroError();
});

// Roll errors are cleared at the start of every roll and by history navigation,
// so each failed attempt transitions undefined -> message and fires exactly one toast.
watch(error, (message) => {
  if (message)
    notificationStore.error(message);
});

// The profile snapshot can arrive after the roller mounts, and can be replaced or cleared
// during auth transitions. Reloading on identity changes prevents cross-user leakage.
if (userStore) {
  // Hydrate on authentication identity/readiness changes. Do not watch the saved
  // array itself: updateDoc produces a new profile snapshot after a successful
  // write, and reloading from that snapshot can race the optimistic queue and
  // replace the just-saved state with the previous snapshot.
  watch(() => [userStore.isAuthResolved, userStore.user?.uid, userStore.profile != null], () => {
    void reloadMacros();
  });
}

const inputRef = ref<{ $el?: HTMLElement } | null>(null);
const historyOpen = ref(false);
const syntaxHelpOpen = ref(false);
const expressionHasSyntaxError = computed(() => {
  if (!expression.value.trim())
    return false;

  try {
    parseDiceExpression(expression.value);
    return false;
  } catch {
    return true;
  }
});

const syntaxGroups = [
  {
    title: 'General',
    entries: [
      { syntax: 'NdX', description: 'Roll N dice with X sides.', example: '3d6 + 5' },
      { syntax: '+ - * / %', description: 'Add, subtract, multiply, divide, or take the remainder; multiplication, division, and remainder bind before addition and subtraction.', example: '2d6 + 3 * 4' },
      { syntax: '(expr)~N', description: 'Roll the parenthesized expression N independent times and add the totals (N is 1–10,000).', example: '(nd 1d6 + 2)~8' },
      { syntax: 'khN / kN', description: 'Keep the highest N dice.', example: '4d6kh3' },
      { syntax: 'klN', description: 'Keep the lowest N dice.', example: '2d20kl1' },
      { syntax: 'dlN / dhN', description: 'Drop the lowest or highest N dice.', example: '4d6dl1' },
      { syntax: '!', description: 'Explode dice on their maximum face.', example: '3d6!' },
      { syntax: '!N / !>=N', description: 'Explode when a die meets a threshold.', example: '1d10!>=8' },
      { syntax: '!p / ![N]', description: 'Explode only the primary or numbered die.', example: '3d6!p' },
      { syntax: '!!', description: 'Compound an explosion into the same die.', example: '1d6!!' },
      { syntax: 'rN / r<=N', description: 'Reroll while the condition is met.', example: '1d20r1' },
      { syntax: 'roN', description: 'Reroll once when the condition is met.', example: '1d20ro1' },
      { syntax: '{ ... }', description: 'Combine pools with individual rules.', example: '{1d6!, 2d6} + 2' },
      { syntax: '( ... )', description: 'Group arithmetic using normal precedence.', example: '(1d6 + 2) * 3' },
      { syntax: 'std: / raw:', description: 'Use standard rolling inside a profile.', example: 'std: 1d20' },
    ],
  },
  {
    title: 'D&D 5e',
    entries: [
      { syntax: 'NdXaM', description: 'Advantage: roll M extra dice and drop the lowest M.', example: '1d20a' },
      { syntax: 'NdXdM', description: 'Disadvantage: roll M extra dice and drop the highest M.', example: '1d20d' },
      { syntax: 'Nat 1 / 20', description: 'With this profile, hint the natural face only when exactly one d20 survives Keep/Drop.', example: '2d20kl1' },
    ],
  },
  {
    title: 'Nimble',
    entries: [
      { syntax: 'nd NdX', description: 'Nimble damage: the primary die explodes.', example: 'nd 2d6' },
      { syntax: 'nd NdXaM', description: 'Nimble damage with advantage on the primary die.', example: 'nd 2d6a' },
      { syntax: 'nd NdXdM', description: 'Nimble damage with disadvantage on the primary die.', example: 'nd 2d6d' },
      { syntax: 'nd NdX + M', description: 'Nimble damage with a flat modifier.', example: 'nd 2d6 + 3' },
      { syntax: '+^N / bN', description: 'Add to each face value without a maximum cap.', example: '1d6+^1' },
    ],
  },
];

const selectExpression = async () => {
  await nextTick();
  inputRef.value?.$el?.querySelector('input')?.select();
};

const rollAndSelectExpression = async () => {
  if (await roll())
    await selectExpression();
};

const profileMenuOptions = computed(() => diceProfileOptions.map(option => ({
  text: option.label,
  value: option.id,
  rightIcon: profileId.value === option.id ? 'check' : undefined,
})));

// Keep the menu reachable before the first roll so new users can discover saving.
const historyAvailable = computed(() => true);
const saveValidationError = computed(() => validateMacro(expression.value, profileId.value));
const saveDisabled = computed(() => Boolean(saveValidationError.value) || macros.value.length >= MAX_SAVED_DICE_MACROS || macroSaving.value);
const saveHint = computed(() => {
  if (macros.value.length >= MAX_SAVED_DICE_MACROS)
    return `${MAX_SAVED_DICE_MACROS} saved macros maximum`;
  return saveValidationError.value ?? 'Save current expression';
});

const selectProfile = (option: { value: string }) => {
  profileId.value = option.value as typeof profileId.value;
};

const selectHistoryEntry = (index: number) => {
  const entry = history.value[index];
  if (!entry)
    return;
  result.value = entry.result;
  expression.value = entry.result.expression;
  profileId.value = entry.profileId;
  error.value = undefined;
  historyOpen.value = false;
};

const selectMacro = async (id: string) => {
  const macro = useMacro(id);
  if (!macro)
    return;
  expression.value = macro.expression;
  profileId.value = macro.profileId;
  result.value = undefined;
  error.value = undefined;
  historyOpen.value = false;
  await selectExpression();
};

const isSavedExpression = (candidate: string, candidateProfileId: DiceProfileId) => macros.value.some(macro => canonicalDiceExpression(macro.expression) === canonicalDiceExpression(candidate) && macro.profileId === candidateProfileId);

const currentMacro = computed(() => macros.value.find(macro => canonicalDiceExpression(macro.expression) === canonicalDiceExpression(expression.value) && macro.profileId === profileId.value));
const saveCurrentMacro = () => {
  void saveMacro(expression.value, profileId.value);
};
const toggleCurrentMacro = () => {
  if (currentMacro.value)
    void removeMacro(currentMacro.value.id);
  else
    void saveMacro(expression.value, profileId.value);
};
const saveHistoryMacro = (index: number) => {
  const entry = history.value[index];
  if (!entry)
    return;
  const existing = macros.value.find(macro => canonicalDiceExpression(macro.expression) === canonicalDiceExpression(entry.result.expression) && macro.profileId === entry.profileId);
  if (existing)
    void removeMacro(existing.id);
  else
    void saveMacro(entry.result.expression, entry.profileId);
};
const deleteMacro = (id: string) => {
  void removeMacro(id);
};
const renameMacroPrompt = (macro: DiceRollerMacro) => {
  // eslint-disable-next-line no-alert
  const label = window.prompt('Macro label', macro.label ?? macro.expression);
  if (label !== null)
    void renameMacro(macro.id, label);
};

const physicalKeyMap: Record<string, string> = Object.fromEntries(
  Array.from({ length: 26 }, (_, index) => {
    const letter = String.fromCharCode(65 + index);
    return [`Key${letter}`, letter.toLowerCase()];
  }),
);

let pendingPhysicalKey: { code: string; shiftKey: boolean } | undefined;

const rememberPhysicalKey = (event: KeyboardEvent) => {
  if (!(event.target instanceof HTMLInputElement))
    return;

  pendingPhysicalKey = { code: event.code, shiftKey: event.shiftKey };
};

const remapBeforeInput = (event: InputEvent) => {
  const input = event.target;
  const physicalKey = pendingPhysicalKey;
  pendingPhysicalKey = undefined;

  if (!(input instanceof HTMLInputElement))
    return;

  if (event.inputType !== 'insertText' || event.isComposing || event.data == null || [...event.data].length !== 1 || physicalKey == null)
    return;

  const replacement = physicalKeyMap[physicalKey.code];
  if (replacement == null)
    return;

  event.preventDefault();

  const mapped = physicalKey.shiftKey ? replacement.toUpperCase() : replacement;
  input.setRangeText(
    mapped,
    input.selectionStart ?? input.value.length,
    input.selectionEnd ?? input.value.length,
    'end',
  );
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: mapped,
  }));
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

type ResultTraceUnit =
  | { type: 'pool'; key: string; pools: Extract<EvaluationTraceNode, { type: 'POOL' }>[] }
  | { type: 'nimble-group'; key: string; pools: Extract<EvaluationTraceNode, { type: 'POOL' }>[]; value: number; voided: boolean; flatModifier?: number };

// Keep Nimble's semantic group boundary in the ordinary result rundown too.
const traceResultUnits = (trace: EvaluationTraceNode): ResultTraceUnit[] => {
  if (trace.type === 'POOL')
    return [{ type: 'pool', key: `pool-${trace.poolId}`, pools: [trace] }];
  if (trace.type === 'GROUPED_POOL') {
    if (trace.intent === 'nimble-damage') {
      const pools = trace.pools.flatMap(tracePools);
      if (pools.length > 0) {
        return [{
          type: 'nimble-group',
          key: `nimble-${pools.map(pool => pool.poolId).join('-')}`,
          pools,
          value: trace.voided ? 0 : trace.value,
          voided: Boolean(trace.voided),
          flatModifier: trace.flatModifier,
        }];
      }
      return [];
    }
    return trace.pools.flatMap(traceResultUnits);
  }
  if (trace.type === 'REPETITION')
    return trace.repetitions.flatMap(traceResultUnits);
  if (trace.type === 'ARITHMETIC')
    return [...traceResultUnits(trace.left), ...traceResultUnits(trace.right)];
  return [];
};

type RepetitionTraceUnit =
  | { type: 'pool'; key: string; pools: Extract<EvaluationTraceNode, { type: 'POOL' }>[] }
  | { type: 'nimble-group'; key: string; pools: Extract<EvaluationTraceNode, { type: 'POOL' }>[]; value: number; voided: boolean; flatModifier?: number };

// Preserve each Nimble intent boundary in repetition details so sibling `nd`
// groups remain distinct instead of flattening into indistinguishable Primary rows.
const traceSectionUnits = (trace: EvaluationTraceNode): RepetitionTraceUnit[] => {
  if (trace.type === 'POOL')
    return [{ type: 'pool', key: `pool-${trace.poolId}`, pools: [trace] }];
  if (trace.type === 'GROUPED_POOL') {
    if (trace.intent === 'nimble-damage') {
      const pools = trace.pools.flatMap(tracePools);
      return [{
        type: 'nimble-group',
        key: `nimble-${pools.map(pool => pool.poolId).join('-') || 'empty'}`,
        pools,
        value: trace.voided ? 0 : trace.value,
        voided: Boolean(trace.voided),
        flatModifier: trace.flatModifier,
      }];
    }
    return trace.pools.flatMap(traceSectionUnits);
  }
  if (trace.type === 'ARITHMETIC')
    return [...traceSectionUnits(trace.left), ...traceSectionUnits(trace.right)];
  return [];
};

const genericPoolNumbers = (trace: EvaluationTraceNode): Map<number, number> => {
  const numbers = new Map<number, number>();
  const visit = (node: EvaluationTraceNode, nextNumber: number): number => {
    if (node.type === 'POOL') {
      if (!node.provenance)
        numbers.set(node.poolId, nextNumber++);
      return nextNumber;
    }
    if (node.type === 'REPETITION') {
      // Generic pool numbering starts over for each independently evaluated repetition.
      node.repetitions.forEach(repetition => visit(repetition, 1));
      return nextNumber;
    }
    if (node.type === 'GROUPED_POOL')
      return node.pools.reduce((next, pool) => visit(pool, next), nextNumber);
    if (node.type === 'ARITHMETIC')
      return visit(node.right, visit(node.left, nextNumber));
    return nextNumber;
  };
  visit(trace, 1);
  return numbers;
};

const poolLabel = (pool: Extract<EvaluationTraceNode, { type: 'POOL' }>, index: number, compact = false): string => {
  if (pool.provenance?.intent === 'nimble-damage') {
    if (pool.provenance.role === 'primary')
      return compact ? 'Primary' : 'Nimble damage · primary die';
    if (pool.provenance.role === 'extra')
      return compact ? 'Extra' : 'Nimble damage · extra dice';
  }
  if (pool.provenance?.intent === 'dnd5e-advantage')
    return 'Advantage';
  return `Pool ${index + 1}`;
};

const resultPoolLabel = (trace: EvaluationTraceNode, pool: Extract<EvaluationTraceNode, { type: 'POOL' }>, index: number): string => {
  const genericIndex = genericPoolNumbers(trace).get(pool.poolId);
  return poolLabel(pool, (genericIndex ?? index + 1) - 1, true);
};

const traceRepetitions = (trace: EvaluationTraceNode): Extract<EvaluationTraceNode, { type: 'REPETITION' }>[] => {
  if (trace.type === 'REPETITION')
    return [trace];
  if (trace.type === 'GROUPED_POOL')
    return trace.pools.flatMap(traceRepetitions);
  if (trace.type === 'ARITHMETIC')
    return [...traceRepetitions(trace.left), ...traceRepetitions(trace.right)];
  return [];
};

const nestedTraceRepetitions = (trace: EvaluationTraceNode): Extract<EvaluationTraceNode, { type: 'REPETITION' }>[] => {
  if (trace.type === 'REPETITION')
    return [trace];
  if (trace.type === 'GROUPED_POOL')
    return trace.pools.flatMap(nestedTraceRepetitions);
  if (trace.type === 'ARITHMETIC')
    return [...nestedTraceRepetitions(trace.left), ...nestedTraceRepetitions(trace.right)];
  return [];
};

const traceRepetitionSections = (repetition: Extract<EvaluationTraceNode, { type: 'REPETITION' }>) => {
  const sections: { outcome: EvaluationTraceNode; label: string; depth: number }[] = [];
  const append = (node: Extract<EvaluationTraceNode, { type: 'REPETITION' }>, prefix = '', depth = 0) => {
    node.repetitions.forEach((outcome, index) => {
      const path = prefix ? `${prefix}.${index + 1}` : String(index + 1);
      sections.push({ outcome, label: `Repetition ${path}`, depth });
      const nested = nestedTraceRepetitions(outcome);
      nested.forEach((child, childIndex) => {
        append(child, nested.length > 1 ? `${path}.${childIndex + 1}` : path, depth + 1);
      });
    });
  };
  append(repetition);
  return sections;
};

const traceDieResult = (die: Extract<EvaluationTraceNode, { type: 'POOL' }>['dice'][number]): string => {
  const rolls = [die.initialRoll, ...die.rerolls];
  const rollText = rolls.length > 1 ? `${rolls[0]} ↻ ${rolls.slice(1).join(' ↻ ')}` : String(rolls[0]);
  const settled = die.finalValue !== rolls.at(-1) ? ` → ${die.finalValue}` : '';
  return `${rollText}${settled}`;
};

const traceDieText = (die: Extract<EvaluationTraceNode, { type: 'POOL' }>['dice'][number]): string =>
  `${die.generatedBy ? '+ ' : ''}d${die.sides}: ${traceDieResult(die)}`;

const traceDieHint = (die: Extract<EvaluationTraceNode, { type: 'POOL' }>['dice'][number]): string => {
  if (die.exploded)
    return 'Exploded';
  const facts: string[] = [];
  for (const event of die.events ?? []) {
    switch (event.type) {
      case 'ROLLED':
        facts.push(`rolled ${event.value}`);
        break;
      case 'KEPT':
        facts.push('kept after filtering');
        break;
      case 'DROPPED':
        facts.push('dropped by Keep/Drop');
        break;
      case 'BUMPED':
        facts.push(`bumped ${event.from} by ${event.amount} to ${event.to}`);
        break;
      case 'REROLLED':
        facts.push(`rerolled ${event.from} to ${event.to}`);
        break;
      case 'EXPLODED':
        facts.push('exploded');
        break;
      case 'ADDED_BY_EXPLOSION':
        facts.push('generated by explosion');
        break;
    }
  }
  return facts.join('; ') || (die.dropped ? 'dropped' : 'kept as rolled');
};

const nimbleBreakdownLabel = (
  pools: Extract<EvaluationTraceNode, { type: 'POOL' }>[],
  flatModifier: number,
  value: number,
): string => {
  const poolTotals = pools
    .map((pool, index) => `${poolLabel(pool, index, true)} ${pool.subtotal}`)
    .join(' + ');
  const modifierOperator = flatModifier < 0 ? '−' : '+';
  return `${poolTotals} ${modifierOperator} Modifier ${Math.abs(flatModifier)} = Nimble damage ${value}`;
};

const nimbleBreakdownGridTemplate = (pools: Extract<EvaluationTraceNode, { type: 'POOL' }>[]): string =>
  `repeat(${pools.length}, minmax(0, 1fr) auto) minmax(0, 1fr) auto minmax(0, 1fr)`;

const traceValue = (trace: EvaluationTraceNode): number => {
  if (trace.type === 'LITERAL')
    return trace.value;
  if (trace.type === 'POOL')
    return trace.subtotal;
  if (trace.type === 'GROUPED_POOL' || trace.type === 'REPETITION')
    return trace.value;
  return trace.value;
};

const traceOperand = (trace: EvaluationTraceNode): string => {
  if (trace.type === 'LITERAL')
    return String(trace.value);
  if (trace.type === 'POOL')
    return String(trace.subtotal);
  if (trace.type === 'GROUPED_POOL') {
    if (trace.voided)
      return '0';
    const terms = trace.pools.map(traceOperand);
    if (trace.flatModifier !== undefined)
      terms.push(String(trace.flatModifier));
    if (terms.length === 0)
      return String(trace.value);
    if (terms.length === 1)
      return terms[0]!;
    return `(${terms.join(' + ')})`;
  }
  if (trace.type === 'REPETITION')
    return `(${trace.repetitions.map(traceOperand).join(' + ')})`;
  return `(${traceOperand(trace.left)} ${trace.operator} ${traceOperand(trace.right)})`;
};

const naturalHintText = (hint: NonNullable<typeof result.value>['naturalHints'][number]) => `Nat ${hint.face}`;
const naturalHintDescription = (hint: NonNullable<typeof result.value>['naturalHints'][number]) =>
  `${naturalHintText(hint)} on d${hint.sides}, die ${hint.dieId} in ${hint.context}`;
const poolNaturalHints = (pool: Extract<EvaluationTraceNode, { type: 'POOL' }>) =>
  (result.value?.naturalHints ?? []).filter(hint => hint.poolId === pool.poolId);
const dieNaturalHint = (pool: Extract<EvaluationTraceNode, { type: 'POOL' }>, dieId: number) =>
  poolNaturalHints(pool).find(hint => hint.dieId === dieId);
const resultNaturalClass = computed(() => {
  const kinds = new Set((result.value?.naturalHints ?? []).map(hint => hint.kind));
  return {
    'dice-roller__result-button--natural-minimum': kinds.has('minimum'),
    'dice-roller__result-button--natural-maximum': kinds.has('maximum'),
  };
});
const resultNaturalDescription = computed(() =>
  (result.value?.naturalHints ?? []).map(naturalHintDescription).join('; '));

// Development prototype hook: evaluate fixture draws through the public evaluator,
// then feed its complete result into the same result presentation used by normal rolls.
const loadDeterministicResult = async (fixture: {
  expression: string;
  profileId: DiceProfileId;
  draws: number[];
}): Promise<void> => {
  const profile = fixture.profileId === 'dnd5e'
    ? Dnd5eProfile
    : fixture.profileId === 'nimble5e'
      ? NimbleProfile
      : undefined;
  let drawIndex = 0;
  const rng: RandomGenerator = async (min, max) => {
    const draw = fixture.draws[drawIndex++];
    if (draw === undefined || draw < min || draw > max)
      throw new Error(`Fixture ran out of valid draws for d${max}`);
    return draw;
  };

  expression.value = fixture.expression;
  profileId.value = fixture.profileId;
  error.value = undefined;
  result.value = await evaluateDiceExpression(fixture.expression, rng, profile);
};

const clearDeterministicResult = () => {
  expression.value = '';
  profileId.value = 'none';
  result.value = undefined;
  error.value = undefined;
};

defineExpose({ loadDeterministicResult, clearDeterministicResult });
</script>

<template>
  <div class="dice-roller">
    <section class="dice-roller__row" aria-label="Dice roller">
      <slot name="leading" />

      <VaMenu :options="profileMenuOptions" @selected="selectProfile">
        <template #anchor>
          <VaButton
            class="dice-roller__profile-button"
            preset="secondary"
            :color="profileId === 'none' ? 'tertiary' : 'primary-dark'"
            icon="settings"
            :aria-label="`Dice profile: ${diceProfileOptions.find(option => option.id === profileId)?.label}`"
            :title="`System Profile: ${diceProfileOptions.find(option => option.id === profileId)?.label}; natural hints follow the selected profile`"
          />
        </template>
      </VaMenu>

      <VaDropdown v-model="historyOpen" class="dice-roller__history-menu" placement="bottom-start">
        <template #anchor>
          <VaButton class="dice-roller__history-button" preset="secondary" color="tertiary" icon="history" aria-label="Roll history" :disabled="!historyAvailable" />
        </template>
        <VaDropdownContent class="dice-roller__history-content">
          <va-scroll-container vertical class="dice-roller__history-scroll">
            <section class="dice-roller__section" aria-label="Saved macros">
              <div class="dice-roller__section-header">
                <span class="dice-roller__section-title">Saved macros <span class="dice-roller__section-count">{{ macros.length }}/{{ MAX_SAVED_DICE_MACROS }}</span></span>
                <VaButton size="small" preset="secondary" icon="bookmark_add" :disabled="saveDisabled" :title="saveHint" aria-label="Save current expression" @click.stop="saveCurrentMacro" />
              </div>
              <span v-if="saveValidationError && expression.trim()" class="dice-roller__save-hint" role="status">{{ saveValidationError }}</span>
              <span v-if="macros.length === 0" class="dice-roller__empty">No saved macros yet</span>
              <div v-else class="dice-roller__macro-list">
                <div v-for="macro in macros" :key="macro.id" class="dice-roller__macro-row">
                  <button type="button" class="dice-roller__macro-load" @click="selectMacro(macro.id)">
                    <span>{{ macro.label || macro.expression }}</span>
                    <code v-if="macro.label">{{ macro.expression }}</code>
                    <small v-if="macro.profileId !== 'none'">{{ diceProfileOptions.find(option => option.id === macro.profileId)?.label }}</small>
                  </button>
                  <VaButton preset="plain" icon="edit" aria-label="Rename macro" @click.stop="renameMacroPrompt(macro)" />
                  <VaButton preset="plain" icon="delete" aria-label="Delete macro" @click.stop="deleteMacro(macro.id)" />
                </div>
              </div>
            </section>
            <VaDivider class="dice-roller__divider" />
            <section class="dice-roller__section" aria-label="Recent rolls">
              <span class="dice-roller__section-header">
                <span class="dice-roller__section-title">Recent rolls</span>
              </span>
              <span v-if="history.length === 0" class="dice-roller__empty">No recent rolls yet</span>
              <div v-else class="dice-roller__macro-list">
                <div v-for="(entry, index) in history" :key="`${entry.result.expression}-${index}`" class="dice-roller__macro-row">
                  <button type="button" class="dice-roller__macro-load" @click="selectHistoryEntry(index)">
                    {{ entry.result.expression }} = {{ entry.result.total }}
                  </button>
                  <VaButton preset="plain" :icon="isSavedExpression(entry.result.expression, entry.profileId) ? 'bookmark' : 'bookmark_border'" :aria-label="isSavedExpression(entry.result.expression, entry.profileId) ? 'Remove saved expression' : 'Save expression'" @click.stop="saveHistoryMacro(index)" />
                </div>
              </div>
            </section>
          </va-scroll-container>
        </VaDropdownContent>
      </VaDropdown>

      <VaButton
        class="dice-roller__save-button"
        preset="secondary"
        color="tertiary"
        :icon="currentMacro ? 'bookmark' : 'bookmark_border'"
        :aria-label="currentMacro ? 'Remove saved expression' : 'Save expression'"
        :disabled="!currentMacro && saveDisabled"
        :title="currentMacro ? 'Remove saved expression' : saveHint"
        @click="toggleCurrentMacro"
      />

      <VaButton
        class="dice-roller__help-button"
        preset="secondary"
        color="tertiary"
        icon="help_outline"
        aria-label="Dice syntax help"
        @click="syntaxHelpOpen = true"
      />

      <VaInput
        ref="inputRef"
        v-model="expression"
        class="dice-roller__input"
        :class="{ 'dice-roller__input--invalid': expressionHasSyntaxError }"
        placeholder="4d6kh3 + 2"
        aria-label="Dice expression"
        input-aria-label="Dice expression"
        @keydown="rememberPhysicalKey"
        @beforeinput="remapBeforeInput"
        @keyup.enter="rollAndSelectExpression"
        @keyup.up="showPrevious"
        @keyup.down="showNext"
      />

      <VaDivider vertical style="align-self:normal; margin-block:5px" />

      <VaDropdown class="dice-roller__result-menu" placement="bottom-end" :close-on-content-click="false" stick-to-edges>
        <template #anchor>
          <div class="dice-roller__result-anchor">
            <VaButton
              class="dice-roller__result-button"
              :class="resultNaturalClass"
              preset="primary"
              :loading="rolling"
              :aria-busy="rolling"
              :title="resultNaturalDescription || undefined"
              :aria-label="rolling ? 'Rolling dice' : result ? `Show details for ${result.expression}, total ${result.total}${resultNaturalDescription ? `; ${resultNaturalDescription}` : ''}` : 'No roll yet'"
            >
              <strong class="dice-roller__total">{{ result?.total ?? 0 }}</strong>
            </VaButton>
          </div>
        </template>
        <VaDropdownContent class="dice-roller__detail">
          <va-scroll-container vertical class="dice-roller__detail-scroll">
            <template v-if="result">
              <div class="dice-roller__detail-title">
                Roll details
              </div>
              <section v-for="(repetition, repetitionIndex) in traceRepetitions(result.trace)" :key="`repetition-${repetitionIndex}`" class="dice-roller__repetition-results" aria-label="Repetition results">
                <section v-for="section in traceRepetitionSections(repetition)" :key="section.label" class="dice-roller__repetition-result" :aria-label="section.label" :style="{ marginInlineStart: `${section.depth * 12}px` }">
                  <div class="dice-roller__repetition-heading">
                    <div>
                      <strong>{{ section.label }}</strong>
                    </div>
                    <strong class="dice-roller__repetition-value" :aria-label="`${section.label} total ${traceValue(section.outcome)}`">= {{ traceValue(section.outcome) }}</strong>
                  </div>
                  <section
                    v-for="(unit, unitIndex) in traceSectionUnits(section.outcome)"
                    :key="`${unit.key}-${unitIndex}`"
                    class="dice-roller__repetition-unit"
                    :class="{ 'dice-roller__repetition-unit--nimble': unit.type === 'nimble-group' }"
                    :aria-label="unit.type === 'nimble-group' ? (unit.voided ? 'Nimble damage group, voided, total zero' : `Nimble damage group, total ${unit.value}`) : undefined"
                  >
                    <div v-if="unit.type === 'nimble-group'" class="dice-roller__repetition-group-heading">
                      <span>Nimble damage</span>
                      <strong :aria-label="unit.voided ? 'Group total zero, voided' : `Group total ${unit.value}`">
                        = {{ unit.value }}
                      </strong>
                    </div>
                    <div v-for="(pool, poolIndex) in unit.pools" :key="pool.poolId" class="dice-roller__pool">
                      <div class="dice-roller__pool-heading">
                        <span class="dice-roller__pool-label">{{ poolLabel(pool, (genericPoolNumbers(section.outcome).get(pool.poolId) ?? poolIndex + 1) - 1, true) }}</span>
                        <span
                          v-for="hint in poolNaturalHints(pool)"
                          :key="`${hint.poolId}-${hint.dieId}-${hint.kind}`"
                          class="dice-roller__pool-natural"
                          :class="`dice-roller__pool-natural--${hint.kind}`"
                          :title="naturalHintDescription(hint)"
                          :aria-label="naturalHintDescription(hint)"
                        >{{ naturalHintText(hint) }}</span>
                        <span v-if="unit.type === 'pool'" class="dice-roller__pool-subtotal" :aria-label="`Pool value ${pool.subtotal}`">
                          = <strong>{{ pool.subtotal }}</strong>
                        </span>
                      </div>
                      <div class="dice-roller__dice" :aria-label="`${poolLabel(pool, (genericPoolNumbers(section.outcome).get(pool.poolId) ?? poolIndex + 1) - 1, true)} dice`">
                        <VaChip
                          v-for="die in pool.dice"
                          :key="die.dieId"
                          size="small"
                          :color="die.dropped ? 'secondary' : 'background-element'"
                          :class="{
                            'dice-roller__die--dropped': die.dropped,
                            'dice-roller__die--exploded': die.exploded,
                            'dice-roller__die--natural-minimum': dieNaturalHint(pool, die.dieId)?.kind === 'minimum',
                            'dice-roller__die--natural-maximum': dieNaturalHint(pool, die.dieId)?.kind === 'maximum',
                          }"
                          :title="[traceDieHint(die), dieNaturalHint(pool, die.dieId) ? naturalHintDescription(dieNaturalHint(pool, die.dieId)!) : ''].filter(Boolean).join('; ')"
                          :aria-label="`${traceDieText(die)}; ${traceDieHint(die)}${dieNaturalHint(pool, die.dieId) ? `; ${naturalHintDescription(dieNaturalHint(pool, die.dieId)!)}` : ''}`"
                        >
                          <span class="dice-roller__die-metadata" aria-hidden="true">{{ die.generatedBy ? '+ ' : '' }}d{{ die.sides }}:</span>
                          {{ traceDieResult(die) }}
                          <span v-if="die.exploded" class="dice-roller__die-marker" title="Explosion" aria-hidden="true">✦</span>
                          <span v-if="die.capped" class="dice-roller__die-marker">Safety cap</span>
                          <span v-if="die.bumpAmount" class="dice-roller__die-marker">+{{ die.bumpAmount }} bump</span>
                        </VaChip>
                      </div>
                    </div>
                    <div
                      v-if="unit.type === 'nimble-group' && unit.flatModifier !== undefined && !unit.voided"
                      class="dice-roller__nimble-breakdown"
                      :style="{ gridTemplateColumns: nimbleBreakdownGridTemplate(unit.pools) }"
                      role="group"
                      :aria-label="nimbleBreakdownLabel(unit.pools, unit.flatModifier, unit.value)"
                    >
                      <template v-for="(pool, poolIndex) in unit.pools" :key="`breakdown-${pool.poolId}`">
                        <span v-if="poolIndex > 0" class="dice-roller__nimble-breakdown-operator" aria-hidden="true">+</span>
                        <div class="dice-roller__nimble-breakdown-term">
                          <span>{{ poolLabel(pool, (genericPoolNumbers(section.outcome).get(pool.poolId) ?? poolIndex + 1) - 1, true) }}</span>
                          <strong>{{ pool.subtotal }}</strong>
                        </div>
                      </template>
                      <span class="dice-roller__nimble-breakdown-operator" aria-hidden="true">{{ unit.flatModifier < 0 ? '−' : '+' }}</span>
                      <div class="dice-roller__nimble-breakdown-term dice-roller__nimble-breakdown-term--modifier">
                        <span>Modifier</span>
                        <strong>{{ Math.abs(unit.flatModifier) }}</strong>
                      </div>
                      <span class="dice-roller__nimble-breakdown-operator" aria-hidden="true">=</span>
                      <div class="dice-roller__nimble-breakdown-term dice-roller__nimble-breakdown-term--total">
                        <span>Total</span>
                        <strong>{{ unit.value }}</strong>
                      </div>
                    </div>
                  </section>
                  <div class="dice-roller__equation dice-roller__repetition-equation" :aria-label="`${section.label} calculation`">
                    <strong>{{ traceOperand(section.outcome) }} = {{ traceValue(section.outcome) }}</strong>
                  </div>
                </section>
              </section>
              <div v-if="result.capped" class="dice-roller__cap-warning" role="alert">
                Safety cap reached — this is a partial result.
              </div>
              <template v-if="traceRepetitions(result.trace).length === 0">
                <div
                  v-for="unit in traceResultUnits(result.trace)"
                  :key="unit.key"
                  class="dice-roller__pool-result-unit"
                  :class="{ 'dice-roller__pool-result-unit--pool': unit.type === 'pool', 'dice-roller__pool-result-unit--nimble': unit.type === 'nimble-group' }"
                  :aria-label="unit.type === 'nimble-group' ? (unit.voided ? 'Nimble damage group, voided, total zero' : `Nimble damage group, total ${unit.value}`) : undefined"
                >
                  <div
                    v-if="unit.type === 'nimble-group'"
                    class="dice-roller__pool-result-unit-heading"
                    :title="unit.voided ? 'Nimble damage group is voided' : undefined"
                  >
                    <span>Nimble damage</span>
                    <strong :aria-label="unit.voided ? 'Nimble damage total zero, voided' : `Nimble damage total ${unit.value}`">
                      = {{ unit.value }}
                    </strong>
                  </div>
                  <div v-for="(pool, poolIndex) in unit.pools" :key="pool.poolId" class="dice-roller__pool">
                    <div class="dice-roller__pool-heading">
                      <span class="dice-roller__pool-label">{{ resultPoolLabel(result.trace, pool, poolIndex) }}</span>
                      <span
                        v-for="hint in poolNaturalHints(pool)"
                        :key="`${hint.poolId}-${hint.dieId}-${hint.kind}`"
                        class="dice-roller__pool-natural"
                        :class="`dice-roller__pool-natural--${hint.kind}`"
                        :title="naturalHintDescription(hint)"
                        :aria-label="naturalHintDescription(hint)"
                      >{{ naturalHintText(hint) }}</span>
                      <span class="dice-roller__pool-subtotal" :aria-label="`Pool value ${pool.subtotal}`">
                        = <strong>{{ pool.subtotal }}</strong>
                      </span>
                    </div>
                    <div class="dice-roller__dice" :aria-label="resultPoolLabel(result.trace, pool, poolIndex) ? `${resultPoolLabel(result.trace, pool, poolIndex)} dice` : 'Dice'">
                      <VaChip
                        v-for="die in pool.dice"
                        :key="die.dieId"
                        size="small"
                        :color="die.dropped ? 'secondary' : 'background-element'"
                        :class="{
                          'dice-roller__die--dropped': die.dropped,
                          'dice-roller__die--exploded': die.exploded,
                          'dice-roller__die--natural-minimum': dieNaturalHint(pool, die.dieId)?.kind === 'minimum',
                          'dice-roller__die--natural-maximum': dieNaturalHint(pool, die.dieId)?.kind === 'maximum',
                        }"
                        :title="[traceDieHint(die), dieNaturalHint(pool, die.dieId) ? naturalHintDescription(dieNaturalHint(pool, die.dieId)!) : ''].filter(Boolean).join('; ')"
                        :aria-label="`${traceDieText(die)}; ${traceDieHint(die)}${dieNaturalHint(pool, die.dieId) ? `; ${naturalHintDescription(dieNaturalHint(pool, die.dieId)!)}` : ''}`"
                      >
                        <span class="dice-roller__die-metadata" aria-hidden="true">{{ die.generatedBy ? '+ ' : '' }}d{{ die.sides }}:</span>
                        {{ traceDieResult(die) }}
                        <span v-if="die.exploded" class="dice-roller__die-marker" title="Explosion" aria-hidden="true">✦</span>
                        <span v-if="die.capped" class="dice-roller__die-marker">Safety cap</span>
                        <span v-if="die.bumpAmount" class="dice-roller__die-marker">+{{ die.bumpAmount }} bump</span>
                      </VaChip>
                    </div>
                  </div>
                  <div
                    v-if="unit.type === 'nimble-group' && unit.flatModifier !== undefined && !unit.voided"
                    class="dice-roller__nimble-breakdown"
                    :style="{ gridTemplateColumns: nimbleBreakdownGridTemplate(unit.pools) }"
                    role="group"
                    :aria-label="nimbleBreakdownLabel(unit.pools, unit.flatModifier, unit.value)"
                  >
                    <template v-for="(pool, poolIndex) in unit.pools" :key="`breakdown-${pool.poolId}`">
                      <span v-if="poolIndex > 0" class="dice-roller__nimble-breakdown-operator" aria-hidden="true">+</span>
                      <div class="dice-roller__nimble-breakdown-term">
                        <span>{{ resultPoolLabel(result.trace, pool, poolIndex) }}</span>
                        <strong>{{ pool.subtotal }}</strong>
                      </div>
                    </template>
                    <span class="dice-roller__nimble-breakdown-operator" aria-hidden="true">{{ unit.flatModifier < 0 ? '−' : '+' }}</span>
                    <div class="dice-roller__nimble-breakdown-term dice-roller__nimble-breakdown-term--modifier">
                      <span>Modifier</span>
                      <strong>{{ Math.abs(unit.flatModifier) }}</strong>
                    </div>
                    <span class="dice-roller__nimble-breakdown-operator" aria-hidden="true">=</span>
                    <div class="dice-roller__nimble-breakdown-term dice-roller__nimble-breakdown-term--total">
                      <span>Total</span>
                      <strong>{{ unit.value }}</strong>
                    </div>
                  </div>
                </div>
              </template>
              <div class="dice-roller__equation" aria-label="Final calculation">
                <span>Final calculation</span>
                <strong>{{ traceOperand(result.trace) }} = {{ result.total }}</strong>
              </div>
            </template>
            <span v-else class="dice-roller__detail-empty">Roll the dice to see details.</span>
          </va-scroll-container>
        </VaDropdownContent>
      </VaDropdown>

      <slot name="trailing" />
    </section>

    <VaModal
      v-model="syntaxHelpOpen"
      class="top-tier-modal"
      title="Dice syntax"
      size="large"
      close-button
      hide-default-actions
    >
      <va-scroll-container vertical class="dice-roller__syntax-scroll">
        <section v-for="group in syntaxGroups" :key="group.title" class="dice-roller__syntax-group">
          <h2>{{ group.title }}</h2>
          <dl>
            <div v-for="entry in group.entries" :key="entry.syntax" class="dice-roller__syntax-entry">
              <dt><code>{{ entry.syntax }}</code></dt>
              <dd>{{ entry.description }} <code>{{ entry.example }}</code></dd>
            </div>
          </dl>
        </section>
      </va-scroll-container>
    </VaModal>
  </div>
</template>

<style scoped lang="scss">
.dice-roller {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 48rem;
}

.dice-roller__row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.25rem;
  border-top: 3px solid var(--va-primary);
  background: var(--va-background-element);
  box-shadow: 0 0.35rem 1rem rgb(0 0 0 / 12%);
}

.dice-roller__profile-button,
.dice-roller__save-button,
.dice-roller__history-button,
.dice-roller__help-button {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
}

.dice-roller__result-menu {
  flex-shrink: 0;
}

.dice-roller__history-menu {
  flex-shrink: 0;
}

.dice-roller__history-content {
  padding: 0;
}

.dice-roller__history-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 18rem;
  max-height: min(24rem, calc(100vh - 8rem));
  padding: 0.5rem;
}

.dice-roller__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.dice-roller__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dice-roller__section-title {
  color: var(--va-text-secondary);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.dice-roller__section-count {
  opacity: 0.85;
  letter-spacing: normal;
}

.dice-roller__save-hint {
  font-size: 0.8rem;
  opacity: 0.75;
  overflow-wrap: anywhere;
}

.dice-roller__macro-list {
  display: flex;
  flex-direction: column;
}

.dice-roller__macro-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.25rem;
}

.dice-roller__macro-row:hover {
  background: var(--va-background-border);
}

.dice-roller__macro-row > .va-button {
  flex-shrink: 0;
}

.dice-roller__macro-load {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  text-align: left;
  overflow-wrap: anywhere;
}

.dice-roller__macro-load:focus-visible {
  background: var(--va-background-border);
  outline: none;
}

.dice-roller__macro-load code,
.dice-roller__macro-load small {
  opacity: 0.7;
  font-size: 0.8rem;
}

.dice-roller__empty {
  padding: 0.5rem;
  border-radius: 0.25rem;
  text-align: center;
  opacity: 0.7;
  font-size: 0.8rem;
}

.dice-roller__divider {
  margin-block: 0.15rem;
}

.dice-roller__syntax-scroll {
  max-height: min(70vh, 42rem);
  padding-right: 0.5rem;
}

.dice-roller__syntax-group + .dice-roller__syntax-group {
  margin-top: 1.5rem;
}

.dice-roller__syntax-group h2 {
  margin: 0 0 0.5rem;
  color: var(--va-primary);
  font-size: 1.1rem;
}

.dice-roller__syntax-group dl {
  display: grid;
  gap: 0.5rem;
  margin: 0;
}

.dice-roller__syntax-entry {
  display: grid;
  grid-template-columns: minmax(6rem, 8rem) 1fr;
  gap: 0.75rem;
  align-items: baseline;
}

.dice-roller__syntax-entry dt,
.dice-roller__syntax-entry dd {
  margin: 0;
}

.dice-roller__syntax-entry dt code {
  color: var(--va-primary);
  font-weight: 700;
}

.dice-roller__syntax-entry dd {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
}

.dice-roller__syntax-entry dd code {
  opacity: 0.75;
}

.dice-roller .va-modal-entry {
  display: contents;
}

.dice-roller__result-anchor {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dice-roller__result-button {
  position: relative;
  width: 3.5rem;
  height: 2.25rem;
  flex-shrink: 0;
  justify-content: center;
}

.dice-roller__result-button--natural-minimum .dice-roller__total {
  color: var(--va-warning);
}

.dice-roller__result-button--natural-maximum .dice-roller__total {
  color: var(--va-success);
}

.dice-roller__input {
  width: min(12rem, 42vw);
  flex: 0 1 12rem;
}

.dice-roller__input :deep(.va-input-wrapper__field) {
  font-size: 1rem;
  font-weight: 400;
}

.dice-roller__input--invalid :deep(.va-input-wrapper__field) {
  border-color: var(--va-warning);
}

.dice-roller__total {
  color: var(--va-primary);
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1;
}

.dice-roller__detail {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-sizing: border-box;
  width: min(22rem, calc(100vw - 2rem));
  max-width: min(28rem, calc(100vw - 2rem));
  max-height: min(32rem, calc(100vh - 2rem));
}

.dice-roller__detail-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: min(32rem, calc(100vh - 2rem));
}

.dice-roller__detail-title {
  color: var(--va-primary);
  font-weight: 700;
}

.dice-roller__detail-empty {
  opacity: 0.7;
}

.dice-roller__pool {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dice-roller__repetition-results {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
}

.dice-roller__repetition-result,
.dice-roller__pool-result-unit--nimble {
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--va-background-border);
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--va-background-element) 70%, transparent);
}

.dice-roller__pool-result-unit--pool {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-block: 0.2rem;
}

.dice-roller__pool-result-unit--nimble {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dice-roller__nimble-breakdown {
  display: grid;
  align-items: stretch;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--va-primary) 24%, transparent);
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--va-primary) 5%, transparent);
  font-variant-numeric: tabular-nums;
}

.dice-roller__nimble-breakdown-term {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.15rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--va-background-element) 82%, transparent);
  line-height: 1.1;
}

.dice-roller__nimble-breakdown-term > span {
  color: var(--va-text-secondary);
  font-size: 0.6rem;
  font-weight: 600;
  white-space: nowrap;
}

.dice-roller__nimble-breakdown-term strong {
  color: var(--va-text-primary);
  font-size: 0.85rem;
}

.dice-roller__nimble-breakdown-term--modifier {
  background: color-mix(in srgb, var(--va-warning) 10%, var(--va-background-element));
}

.dice-roller__nimble-breakdown-term--modifier strong {
  color: var(--va-warning);
}

.dice-roller__nimble-breakdown-term--total {
  border: 1px solid color-mix(in srgb, var(--va-primary) 48%, transparent);
  background: color-mix(in srgb, var(--va-primary) 14%, var(--va-background-element));
}

.dice-roller__nimble-breakdown-term--total > span,
.dice-roller__nimble-breakdown-term--total strong {
  color: var(--va-primary);
}

.dice-roller__nimble-breakdown-operator {
  align-self: center;
  color: var(--va-text-secondary);
  font-size: 0.8rem;
  font-weight: 700;
}

.dice-roller__pool-result-unit--nimble .dice-roller__pool-result-unit-heading strong,
.dice-roller__repetition-unit--nimble .dice-roller__repetition-group-heading strong {
  padding: 0.1rem 0.35rem;
  border: 1px solid color-mix(in srgb, var(--va-primary) 48%, transparent);
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--va-primary) 14%, transparent);
  color: var(--va-primary);
}

.dice-roller__pool-result-unit-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--va-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
}

.dice-roller__pool-result-unit-heading strong {
  color: var(--va-text-primary);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dice-roller__repetition-result {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem 0.75rem;
}

.dice-roller__repetition-result > .dice-roller__pool {
  width: 100%;
}

.dice-roller__repetition-unit {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dice-roller__repetition-unit--nimble {
  padding: 0.25rem 0.4rem;
  border-inline-start: 2px solid var(--va-primary);
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--va-primary) 7%, transparent);
}

.dice-roller__repetition-group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--va-text-secondary);
  font-size: 0.7rem;
}

.dice-roller__repetition-group-heading strong {
  color: var(--va-primary);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dice-roller__repetition-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.dice-roller__repetition-heading > div {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
}

.dice-roller__repetition-value {
  color: var(--va-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dice-roller__cap-warning {
  padding: 0.375rem 0.5rem;
  border-inline-start: 3px solid var(--va-warning);
  color: var(--va-warning);
  font-weight: 600;
}

.dice-roller__pool-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
}

.dice-roller__pool-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.dice-roller__pool-natural {
  display: inline-flex;
  align-items: center;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.05rem 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.dice-roller__pool-natural--minimum {
  color: var(--va-warning);
}

.dice-roller__pool-natural--maximum {
  color: var(--va-success);
}

.dice-roller__pool-subtotal {
  color: var(--va-primary);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dice-roller__pool-subtotal strong {
  color: inherit;
}

.dice-roller__pool-result-unit--nimble .dice-roller__pool-subtotal {
  color: var(--va-text-primary);
}

.dice-roller__die-metadata {
  margin-inline-end: 0.25em;
  opacity: 0.58;
}

.dice-roller__dice {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.dice-roller__die--dropped {
  opacity: 0.45;
  text-decoration: line-through;
}

.dice-roller__die--natural-minimum {
  color: var(--va-warning);
  outline: 1px solid var(--va-warning);
  outline-offset: -2px;
  font-weight: 800;
}

.dice-roller__die--natural-maximum {
  color: var(--va-success);
  outline: 1px solid var(--va-success);
  outline-offset: -2px;
  font-weight: 800;
}

.dice-roller__die--exploded {
  animation: dice-roller-explosion 700ms ease-out;
}

.dice-roller__die-marker {
  margin-left: 0.25rem;
  color: var(--va-primary);
  font-size: 0.8em;
  font-weight: 700;
}

.dice-roller__equation {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  border-top: 1px solid var(--va-background-border);
  padding-top: 0.5rem;
  font-size: 0.8rem;
}

.dice-roller__equation strong {
  color: var(--va-primary);
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.dice-roller__repetition-equation {
  margin-top: 0.1rem;
  padding-top: 0.3rem;
  font-size: 0.75rem;
}

.dice-roller__repetition-equation strong {
  font-size: 0.85rem;
  font-weight: 600;
}

@keyframes dice-roller-explosion {
  from {
    box-shadow: 0 0 0 0 rgb(255 180 0 / 60%);
  }
  to {
    box-shadow: 0 0 0 0.6rem rgb(255 180 0 / 0%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dice-roller__die--exploded {
    animation: none;
  }
}

@media (max-width: 520px) {
  .dice-roller__row {
    display: grid;
    grid-template-columns: repeat(4, 2.25rem) 1px minmax(0, 1fr) 3.5rem;
    grid-template-rows: 2.25rem auto;
    gap: 0.1rem;
    min-width: 0;
  }

  .dice-roller__input {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    min-width: 0;
    flex: none;
  }

  .dice-roller__row > :deep(.va-divider) {
    grid-column: 5;
    grid-row: 1;
  }

  .dice-roller__result-menu {
    grid-column: 7;
    grid-row: 1;
  }

  .dice-roller__input :deep(.va-input-wrapper__text),
  .dice-roller__input :deep(.va-input__content__input) {
    min-width: 0;
  }

  .dice-roller__detail {
    width: min(22rem, calc(100vw - 4rem));
    max-width: min(22rem, calc(100vw - 4rem));
    translate: 0 -1.25rem;
  }

  .dice-roller__total {
    font-size: 1.35rem;
  }

  .dice-roller__syntax-entry {
    grid-template-columns: 1fr;
    gap: 0.125rem;
  }
}
</style>
