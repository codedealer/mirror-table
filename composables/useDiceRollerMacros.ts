import type { ASTNode, DiceProfileId, DiceRollerMacro } from '~/models/Dice';
import type { Profile } from '~/models/types';
import {
  isDiceParseError,
  MAX_DICE_MACRO_EXPRESSION_LENGTH,
  MAX_DICE_MACRO_LABEL_LENGTH,
  MAX_SAVED_DICE_MACROS,
} from '~/models/Dice';
import { Dnd5eProfile, lowerAST, NimbleProfile } from '~/utils/dice-lowering';
import { parseDiceExpression } from '~/utils/dice-parser';

export interface DiceRollerMacroLoadUnavailable {
  status: 'unavailable';
  message?: string;
}

export type DiceRollerMacroLoadResult = DiceRollerMacro[] | DiceRollerMacroLoadUnavailable;

export interface DiceRollerMacroAdapter {
  // Loading is explicitly allowed to report that auth/profile state is not ready.
  // An empty array means the profile is ready and has no saved macros.
  load?: () => DiceRollerMacroLoadResult | Promise<DiceRollerMacroLoadResult>;
  save: (macros: DiceRollerMacro[]) => void | Promise<void>;
}

export interface DiceRollerMacroUserStore {
  user: { uid: string } | null;
  profile: Profile | null;
  updateDiceRollerSavedMacros: (macros: DiceRollerMacro[]) => void | Promise<void>;
}

/** Select an injected adapter first; otherwise wire persistence to the user store. */
export const createDiceRollerMacroAdapter = (
  explicitAdapter: DiceRollerMacroAdapter | undefined,
  userStore: DiceRollerMacroUserStore | undefined,
): DiceRollerMacroAdapter | undefined => explicitAdapter ?? (
  userStore
    ? {
        load: () => {
          if (!userStore.user || !userStore.profile) {
            return {
              status: 'unavailable' as const,
              message: 'Saved macros are unavailable until your profile is ready. Please sign in and try again.',
            };
          }
          return userStore.profile.settings.diceRoller?.savedMacros ?? [];
        },
        save: (macros: DiceRollerMacro[]) => userStore.updateDiceRollerSavedMacros(macros),
      }
    : undefined
);

const profiles = {
  none: undefined,
  nimble5e: NimbleProfile,
  dnd5e: Dnd5eProfile,
} as const;

// Shared canonical form (trim + collapse whitespace) used for macro identity
// comparisons in this composable and in the DiceRoller UI.
export const canonicalDiceExpression = (expression: string) => expression.trim().replace(/\s+/g, ' ');
const unresolvedIntent = (node: ASTNode): 'nimble5e' | 'dnd5e' | undefined => {
  if (node.type === 'NIMBLE_DAMAGE_INTENT')
    return 'nimble5e';
  if (node.type === 'ADVANTAGE_DISADVANTAGE_INTENT')
    return 'dnd5e';
  if (node.type === 'BINARY_OP')
    return unresolvedIntent(node.left) ?? unresolvedIntent(node.right);
  return undefined;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const sanitizeDiceRollerMacros = (value: unknown): DiceRollerMacro[] => {
  if (!Array.isArray(value))
    return [];
  const valid = value.filter((item): item is DiceRollerMacro => {
    if (!item || typeof item !== 'object')
      return false;
    const macro = item as Partial<DiceRollerMacro>;
    // Reject empty/blank IDs and non-finite timestamps so legacy or corrupt
    // Firestore records cannot produce unusable keys or unsortable entries.
    return typeof macro.id === 'string' && macro.id.trim().length > 0 && typeof macro.expression === 'string'
      && macro.expression.trim().length > 0 && macro.expression.trim().length <= MAX_DICE_MACRO_EXPRESSION_LENGTH
      && (macro.profileId === 'none' || macro.profileId === 'nimble5e' || macro.profileId === 'dnd5e')
      && isFiniteNumber(macro.createdAt);
  }).map(item => ({
    id: item.id,
    expression: item.expression.trim(),
    profileId: item.profileId,
    ...(typeof item.label === 'string' && item.label.trim() ? { label: item.label.trim().slice(0, MAX_DICE_MACRO_LABEL_LENGTH) } : {}),
    createdAt: item.createdAt,
    ...(isFiniteNumber(item.lastUsedAt) ? { lastUsedAt: item.lastUsedAt } : {}),
  }));
  // Deduplicate on read by (canonical expression, profileId) so corrupt/legacy
  // persisted data cannot render duplicate rows or consume the cap. Retention
  // rule: keep the most recently used copy — the record with the greatest
  // lastUsedAt, falling back to createdAt when lastUsedAt is absent; ties keep
  // the earliest occurrence in the persisted array order. The same rule applies
  // in save(), which checks duplicates before prepending a new record.
  const byIdentity = new Map<string, DiceRollerMacro>();
  for (const macro of valid) {
    const key = `${canonicalDiceExpression(macro.expression)}\u0000${macro.profileId}`;
    const existing = byIdentity.get(key);
    if (!existing || ((macro.lastUsedAt ?? macro.createdAt) > (existing.lastUsedAt ?? existing.createdAt)))
      byIdentity.set(key, macro);
  }
  return [...byIdentity.values()].slice(0, MAX_SAVED_DICE_MACROS);
};

export const validateDiceMacroExpression = (expression: string, profileId: DiceProfileId): string | undefined => {
  const trimmed = expression.trim();
  if (!trimmed)
    return 'Enter an expression to save';
  if (trimmed.length > MAX_DICE_MACRO_EXPRESSION_LENGTH)
    return `Expression must be ${MAX_DICE_MACRO_EXPRESSION_LENGTH} characters or fewer`;
  try {
    const lowered = lowerAST(parseDiceExpression(trimmed), profiles[profileId]);
    const intentProfile = unresolvedIntent(lowered);
    if (intentProfile) {
      const required = intentProfile === 'nimble5e' ? 'Nimble 5e' : 'D&D 5e';
      return `Activate the "${required}" profile to use this expression`;
    }
  } catch (error) {
    if (isDiceParseError(error))
      return `Could not parse "${error.expression}": ${error.message}`;
    return error instanceof Error ? error.message : 'Invalid dice expression';
  }
  return undefined;
};

export const useDiceRollerMacros = (adapter?: DiceRollerMacroAdapter, initial: DiceRollerMacro[] = []) => {
  // Keep the last successfully persisted value separate from optimistic state. Each
  // queued item is an operation (rather than a snapshot), so it can be rebased when
  // an earlier write fails. This prevents a failed save from being resurrected by a
  // later save/delete/rename that was issued while it was optimistic.
  const committed = sanitizeDiceRollerMacros(initial);
  const macros = ref<DiceRollerMacro[]>(committed);
  const error = ref<string>();
  const saving = ref(false);
  let pending: Array<{
    apply: (state: DiceRollerMacro[]) => DiceRollerMacro[];
    generation: number;
    resolve: (success: boolean) => void;
  }> = [];
  let processing = false;
  let generation = 0;
  let loading = false;
  let unavailable = false;

  const optimisticState = () => pending.reduce((state, operation) => operation.apply(state), committed);
  const refreshOptimisticState = () => {
    macros.value = optimisticState();
    saving.value = processing || loading;
  };

  const processQueue = async () => {
    // Do not write against the temporary empty state while a profile is loading.
    if (processing || loading)
      return;
    processing = true;
    refreshOptimisticState();
    while (pending.length) {
      const operation = pending[0];
      if (operation.generation !== generation) {
        if (pending[0] === operation)
          pending.shift();
        operation.resolve(false);
        continue;
      }
      const next = sanitizeDiceRollerMacros(operation.apply(committed));
      try {
        await adapter?.save(next);
        // A profile transition may have happened while the adapter was writing.
        if (operation.generation === generation && pending[0] === operation) {
          committed.splice(0, committed.length, ...next);
          pending.shift();
          operation.resolve(true);
        } else {
          if (pending[0] === operation)
            pending.shift();
          operation.resolve(false);
        }
      } catch (cause) {
        if (pending[0] === operation)
          pending.shift();
        if (operation.generation === generation)
          error.value = cause instanceof Error ? cause.message : 'Could not save dice macros';
        operation.resolve(false);
      }
      refreshOptimisticState();
    }
    processing = false;
    refreshOptimisticState();
  };

  const persist = (apply: (state: DiceRollerMacro[]) => DiceRollerMacro[]) => {
    const operation = new Promise<boolean>((resolve) => {
      pending.push({ apply, generation, resolve });
      refreshOptimisticState();
    });
    void processQueue();
    return operation;
  };

  const find = (expression: string, profileId: DiceProfileId) => macros.value.find(macro => canonicalDiceExpression(macro.expression) === canonicalDiceExpression(expression) && macro.profileId === profileId);
  const save = async (expression: string, profileId: DiceProfileId, label?: string) => {
    // Never queue a write while auth/profile loading is unresolved. A queued write
    // against the temporary empty list could otherwise erase the eventual profile.
    if (loading) {
      error.value = 'Saved macros are still loading. Please try again when your profile is ready.';
      return undefined;
    }
    if (unavailable) {
      error.value = 'Saved macros are unavailable until your profile is ready. Please sign in and try again.';
      return undefined;
    }
    const validationError = validateDiceMacroExpression(expression, profileId);
    if (validationError) {
      error.value = validationError;
      return undefined;
    }
    const existing = find(expression, profileId);
    if (existing) {
      error.value = 'Already saved';
      return existing;
    }
    if (macros.value.length >= MAX_SAVED_DICE_MACROS) {
      error.value = `${MAX_SAVED_DICE_MACROS} saved macros maximum`;
      return undefined;
    }
    const now = Date.now();
    const macro: DiceRollerMacro = { id: `${now}-${Math.random().toString(36).slice(2)}`, expression: expression.trim(), profileId, createdAt: now };
    const cleanLabel = label?.trim().slice(0, MAX_DICE_MACRO_LABEL_LENGTH);
    if (cleanLabel)
      macro.label = cleanLabel;
    const succeeded = await persist(state => [macro, ...state]);
    return succeeded ? macro : undefined;
  };
  const remove = (id: string) => persist(state => state.filter(macro => macro.id !== id));
  const rename = (id: string, label: string) => {
    const clean = label.trim().slice(0, MAX_DICE_MACRO_LABEL_LENGTH);
    return persist(state => state.map(macro => macro.id === id ? { ...macro, ...(clean ? { label: clean } : { label: undefined }) } : macro));
  };
  const use = (id: string) => {
    const macro = macros.value.find(item => item.id === id);
    if (!macro)
      return undefined;
    void persist(state => state.map(item => item.id === id ? { ...item, lastUsedAt: Date.now() } : item));
    return macro;
  };

  async function reload() {
    const thisGeneration = ++generation;
    for (const operation of pending)
      operation.resolve(false);
    pending = [];
    committed.splice(0, committed.length);
    macros.value = [];
    if (!adapter?.load) {
      unavailable = false;
      saving.value = false;
      return;
    }
    loading = true;
    refreshOptimisticState();
    try {
      const loadResult = await adapter.load();
      if (thisGeneration !== generation)
        return;
      if (!Array.isArray(loadResult)) {
        unavailable = true;
        committed.splice(0, committed.length);
        macros.value = [];
        error.value = loadResult.message ?? 'Saved macros are unavailable until your profile is ready. Please try again.';
        return;
      }
      unavailable = false;
      const loaded = sanitizeDiceRollerMacros(loadResult);
      committed.push(...loaded);
      macros.value = loaded;
      error.value = undefined;
    } catch (cause) {
      if (thisGeneration === generation) {
        unavailable = false;
        committed.splice(0, committed.length);
        macros.value = [];
        error.value = cause instanceof Error ? `Could not load saved macros: ${cause.message}` : 'Could not load saved macros';
      }
    } finally {
      if (thisGeneration === generation) {
        loading = false;
        refreshOptimisticState();
        void processQueue();
      }
    }
  }

  onMounted(() => {
    void reload();
  });
  return {
    macros,
    error,
    saving,
    save,
    remove,
    rename,
    use,
    find,
    validate: validateDiceMacroExpression,
    reload,
    clearError: () => {
      error.value = undefined;
    },
  };
};
