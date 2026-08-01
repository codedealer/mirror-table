import type { RollEvaluationResult, SystemProfile } from '~/models/Dice';
import { isDiceParseError, isDiceProfileRequiredError } from '~/models/Dice';
import { evaluateDiceExpression } from '~/utils/dice-evaluator';
import { Dnd5eProfile, NimbleProfile } from '~/utils/dice-lowering';
import { cryptoRNG } from '~/utils/dice-rng';

export type DiceProfileId = 'none' | 'nimble5e' | 'dnd5e';

export interface DiceProfileOption {
  id: DiceProfileId;
  label: string;
  profile?: SystemProfile;
}

export const diceProfileOptions: DiceProfileOption[] = [
  { id: 'none', label: 'No profile' },
  { id: 'nimble5e', label: 'Nimble 5e', profile: NimbleProfile },
  { id: 'dnd5e', label: 'D&D 5e', profile: Dnd5eProfile },
];

// Roller UI state for the /dev prototype: parses + lowers + evaluates via cryptoRNG (see PLAN.md §9).
export const useDiceRoller = () => {
  const expression = ref('');
  const profileId = ref<DiceProfileId>('none');
  const result = ref<RollEvaluationResult>();
  const error = ref<string>();
  const rolling = ref(false);

  const { history, previous, next, add: addToHistory } = useDiceRollHistory();

  const activeProfile = computed<SystemProfile | undefined>(() => {
    return diceProfileOptions.find(option => option.id === profileId.value)?.profile;
  });

  const roll = async () => {
    if (!expression.value.trim() || rolling.value)
      return;

    rolling.value = true;
    error.value = undefined;

    try {
      const evaluated = await evaluateDiceExpression(expression.value, cryptoRNG, activeProfile.value);
      result.value = evaluated;
      addToHistory(evaluated);
    } catch (err) {
      if (isDiceParseError(err)) {
        error.value = `Could not parse "${err.expression}": ${err.message}`;
      } else if (isDiceProfileRequiredError(err)) {
        error.value = `Activate the "${err.requiredProfile}" profile to roll this expression`;
      } else {
        error.value = err instanceof Error ? err.message : 'Unexpected error while rolling';
      }
    } finally {
      rolling.value = false;
    }
  };

  const showPrevious = () => {
    const previousResult = previous();
    if (!previousResult)
      return;
    result.value = previousResult;
    expression.value = previousResult.expression;
    error.value = undefined;
  };

  const showNext = () => {
    const nextResult = next();
    if (!nextResult)
      return;
    result.value = nextResult;
    expression.value = nextResult.expression;
    error.value = undefined;
  };

  return {
    expression,
    profileId,
    result,
    error,
    rolling,
    history,
    roll,
    showPrevious,
    showNext,
  };
};
