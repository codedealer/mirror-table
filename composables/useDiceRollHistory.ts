import type { RollEvaluationResult } from '~/models/Dice';

const MAX_HISTORY = 50;

export const useDiceRollHistory = () => {
  const history = ref<RollEvaluationResult[]>([]);
  // -1 means "not currently navigating history" (i.e. viewing the live input).
  const cursor = ref(-1);

  const add = (result: RollEvaluationResult) => {
    history.value.unshift(result);
    if (history.value.length > MAX_HISTORY) {
      history.value.length = MAX_HISTORY;
    }
    cursor.value = 0;
  };

  // Cycles to an older result (Up arrow).
  const previous = (): RollEvaluationResult | undefined => {
    if (!history.value.length)
      return undefined;
    cursor.value = Math.min(cursor.value + 1, history.value.length - 1);
    return history.value[cursor.value];
  };

  // Cycles to a more recent result (Down arrow). Returns undefined once back at "live".
  const next = (): RollEvaluationResult | undefined => {
    if (cursor.value <= 0) {
      cursor.value = -1;
      return undefined;
    }
    cursor.value -= 1;
    return history.value[cursor.value];
  };

  const reset = () => {
    cursor.value = -1;
  };

  return {
    history,
    cursor,
    add,
    previous,
    next,
    reset,
  };
};
