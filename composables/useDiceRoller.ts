import type { DiceProfileId, RollEvaluationResult, SystemProfile } from '~/models/Dice';
import { isDiceParseError, isDiceProfileRequiredError } from '~/models/Dice';
import { evaluateDiceExpression } from '~/utils/dice-evaluator';
import { Dnd5eProfile, NimbleProfile } from '~/utils/dice-lowering';
import { cryptoRNG, randomOrgRNG } from '~/utils/dice-rng';

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

const diceRNG = import.meta.dev ? cryptoRNG : randomOrgRNG;

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

  const roll = async (): Promise<boolean> => {
    if (!expression.value.trim() || rolling.value)
      return false;

    rolling.value = true;
    error.value = undefined;

    try {
      const evaluated = await evaluateDiceExpression(expression.value, diceRNG, activeProfile.value);
      result.value = evaluated;
      addToHistory(evaluated, profileId.value);
      return true;
    } catch (err) {
      if (isDiceParseError(err)) {
        error.value = `Could not parse "${err.expression}": ${err.message}`;
      } else if (isDiceProfileRequiredError(err)) {
        error.value = `Activate the "${err.requiredProfile}" profile to roll this expression`;
      } else {
        error.value = err instanceof Error ? err.message : 'Unexpected error while rolling';
      }
      return false;
    } finally {
      rolling.value = false;
    }
  };

  const showPrevious = (): boolean => {
    const previousResult = previous();
    if (!previousResult)
      return false;
    result.value = previousResult.result;
    expression.value = previousResult.result.expression;
    profileId.value = previousResult.profileId;
    error.value = undefined;
    return true;
  };

  const showNext = (): boolean => {
    const nextResult = next();
    if (!nextResult)
      return false;
    result.value = nextResult.result;
    expression.value = nextResult.result.expression;
    profileId.value = nextResult.profileId;
    error.value = undefined;
    return true;
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
