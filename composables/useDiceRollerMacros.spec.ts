import type { DiceRollerMacro } from '~/models/Dice';
import type { Profile } from '~/models/types';
import { describe, expect, it, vi } from 'vitest';
import { createDiceRollerMacroAdapter, sanitizeDiceRollerMacros, useDiceRollerMacros, validateDiceMacroExpression } from './useDiceRollerMacros';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('dice roller macros', () => {
  vi.stubGlobal('ref', <T>(value: T) => ({ value }));
  vi.stubGlobal('onMounted', () => undefined);
  it('wires normal rollers to the user store while injected adapters take precedence', async () => {
    const saved: DiceRollerMacro[][] = [];
    const userStore = {
      user: { uid: 'user-1' },
      profile: { settings: { driveFolderId: '', searchFolderId: '' } } as Profile,
      updateDiceRollerSavedMacros: (macros: DiceRollerMacro[]) => {
        saved.push(macros);
      },
    };
    const explicit = { save: vi.fn() };
    expect(createDiceRollerMacroAdapter(explicit, userStore)).toBe(explicit);

    const adapter = createDiceRollerMacroAdapter(undefined, userStore);
    const macros: DiceRollerMacro[] = [{ id: 'macro-1', expression: '1d6', profileId: 'none', createdAt: 1 }];
    await adapter!.save(macros);
    expect(await adapter!.load!()).toEqual([]);
    expect(saved).toEqual([macros]);
  });

  it('validates profile-specific intent without rolling', () => {
    expect(validateDiceMacroExpression('1d20a', 'none')).toContain('D&D 5e');
    expect(validateDiceMacroExpression('1d20a', 'dnd5e')).toBeUndefined();
    expect(validateDiceMacroExpression('nd 2d6', 'nimble5e')).toBeUndefined();
  });

  it('finds nested unresolved intent and names its owning profile', () => {
    expect(validateDiceMacroExpression('1d6 + 1d20a', 'none')).toContain('D&D 5e');
    expect(validateDiceMacroExpression('1d20d + 1d6', 'none')).toContain('D&D 5e');
  });

  it('sanitizes malformed persisted entries and enforces the cap', () => {
    const valid = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      expression: `1d${index + 2}`,
      profileId: 'none' as const,
      createdAt: index,
    }));
    expect(sanitizeDiceRollerMacros([{ id: 'bad', expression: '', profileId: 'none', createdAt: 0 }, ...valid])).toHaveLength(20);
    expect(sanitizeDiceRollerMacros(valid)[0]).toMatchObject({ id: '0', expression: '1d2' });
  });

  it('deduplicates persisted entries on read by canonical expression and profile', () => {
    const older: DiceRollerMacro = { id: 'a', expression: '1d20 + 5', profileId: 'none', createdAt: 10, lastUsedAt: 20 };
    const newest: DiceRollerMacro = { id: 'b', expression: '1d20   + 5', profileId: 'none', createdAt: 5, lastUsedAt: 99 };
    const otherProfile: DiceRollerMacro = { id: 'c', expression: '1d20+5', profileId: 'dnd5e', createdAt: 7 };
    const untouched: DiceRollerMacro = { id: 'd', expression: '2d6', profileId: 'none', createdAt: 3 };
    const sanitized = sanitizeDiceRollerMacros([older, newest, otherProfile, untouched]);
    // Most recently used copy wins (lastUsedAt 99 beats 20); whitespace is
    // canonicalized; the same expression under a different profile is distinct.
    expect(sanitized).toEqual([newest, otherProfile, untouched]);
    // Falls back to createdAt when neither copy was used; the greatest
    // timestamp wins, and ties keep the earliest occurrence in the persisted
    // order (here 'x' precedes 'z' with the same createdAt).
    expect(sanitizeDiceRollerMacros([
      { id: 'x', expression: '1d6', profileId: 'none', createdAt: 4 },
      { id: 'y', expression: '1d6', profileId: 'none', createdAt: 2 },
      { id: 'z', expression: '1d6', profileId: 'none', createdAt: 4 },
    ])).toEqual([{ id: 'x', expression: '1d6', profileId: 'none', createdAt: 4 }]);
    // Deduplication happens before the cap, so duplicates cannot consume slots.
    const capped = sanitizeDiceRollerMacros([
      ...Array.from({ length: 25 }, (_, index) => ({ id: `dup-${index}`, expression: '1d8', profileId: 'none' as const, createdAt: index })),
      ...Array.from({ length: 20 }, (_, index) => ({ id: `unique-${index}`, expression: `nd ${index + 1}d6`, profileId: 'nimble5e' as const, createdAt: index })),
    ]);
    expect(capped).toHaveLength(20);
    expect(capped.filter(item => item.expression === '1d8')).toHaveLength(1);
  });

  it('rejects empty IDs and non-finite timestamps at the persistence boundary', () => {
    const valid: DiceRollerMacro = { id: 'ok', expression: '1d6', profileId: 'none', createdAt: 1 };
    expect(sanitizeDiceRollerMacros([
      { id: '', expression: '1d6', profileId: 'none', createdAt: 1 },
      { id: '   ', expression: '1d6', profileId: 'none', createdAt: 1 },
      { id: 'nan', expression: '1d6', profileId: 'none', createdAt: Number.NaN },
      { id: 'inf', expression: '1d6', profileId: 'none', createdAt: Number.POSITIVE_INFINITY },
      valid,
      // A non-finite lastUsedAt is normalized away, not treated as a failure.
      { id: 'stale-use', expression: '1d8', profileId: 'none', createdAt: 1, lastUsedAt: Number.NaN },
    ])).toEqual([valid, { id: 'stale-use', expression: '1d8', profileId: 'none', createdAt: 1 }]);
  });

  it('does not report saves as successful while auth/profile state is unavailable or loading', async () => {
    let resolveLoad!: (value: []) => void;
    let phaseLoading = true;
    let available = false;
    const writes: DiceRollerMacro[][] = [];
    const adapter = {
      load: () => phaseLoading
        ? new Promise<[]>((resolve) => { resolveLoad = resolve; })
        : available ? [] : { status: 'unavailable' as const, message: 'Profile is not ready' },
      save: (value: DiceRollerMacro[]) => {
        writes.push(value);
      },
    };
    const roller = useDiceRollerMacros(adapter);
    const reloadPromise = roller.reload();
    expect(await roller.save('1d6', 'none')).toBeUndefined();
    expect(roller.error.value).toContain('still loading');
    expect(writes).toHaveLength(0);

    phaseLoading = false;
    available = true;
    resolveLoad([]);
    await reloadPromise;
    expect(await roller.save('1d6', 'none')).toMatchObject({ expression: '1d6' });
    expect(writes).toHaveLength(1);

    available = false;
    await roller.reload();
    expect(roller.error.value).toContain('Profile is not ready');
    expect(await roller.save('1d8', 'none')).toBeUndefined();
    expect(writes).toHaveLength(1);
  });

  it('keeps a pending save successful across an ordinary profile snapshot', async () => {
    let resolveWrite!: () => void;
    let snapshot: DiceRollerMacro[] = [];
    const adapter = {
      load: () => snapshot,
      save: (value: DiceRollerMacro[]) => {
        snapshot = value;
        return new Promise<void>((resolve) => {
          resolveWrite = resolve;
        });
      },
    };
    const roller = useDiceRollerMacros(adapter);
    await roller.reload();

    const pendingSave = roller.save('1d6', 'none');
    // This models Firestore replacing profile.value with a new object after updateDoc.
    // The component watcher deliberately does not call reload for this snapshot-only change.
    snapshot = [...snapshot];
    resolveWrite();

    expect(await pendingSave).toMatchObject({ expression: '1d6' });
    expect(roller.error.value).toBeUndefined();
    expect(roller.macros.value).toMatchObject([{ expression: '1d6', profileId: 'none' }]);
  });

  it('rebases a rapid second save when the first persistence fails', async () => {
    let rejectFirst!: (error: Error) => void;
    let resolveSecond!: () => void;
    const writes: string[][] = [];
    const adapter = {
      save: (value: { expression: string }[]) => {
        writes.push(value.map(item => item.expression));
        if (writes.length === 1) {
          return new Promise<void>((_, reject) => {
            rejectFirst = reject;
          });
        }
        return new Promise<void>((resolve) => {
          resolveSecond = resolve;
        });
      },
    };
    const roller = useDiceRollerMacros(adapter);
    const first = roller.save('1d6', 'none');
    const second = roller.save('1d8', 'none');
    rejectFirst(new Error('first write failed'));
    await flush();
    expect(writes).toEqual([['1d6'], ['1d8']]);
    expect(roller.macros.value.map(item => item.expression)).toEqual(['1d8']);
    expect(roller.error.value).toBe('first write failed');
    resolveSecond();
    expect(await first).toBeUndefined();
    expect(await second).toMatchObject({ expression: '1d8' });
    expect(roller.error.value).toBe('first write failed');
    expect(roller.macros.value.map(item => item.expression)).toEqual(['1d8']);
  });

  it('rebases delete and rename operations after a failed save', async () => {
    let rejectFirst!: (error: Error) => void;
    let resolveSecond!: () => void;
    const existing: DiceRollerMacro = { id: 'old', expression: '1d4', profileId: 'none', createdAt: 1 };
    const writes: string[][] = [];
    const adapter = {
      save: (value: DiceRollerMacro[]) => {
        writes.push(value.map(item => item.label ?? item.expression));
        if (writes.length === 1) {
          return new Promise<void>((_, reject) => {
            rejectFirst = reject;
          });
        }
        return new Promise<void>((resolve) => {
          resolveSecond = resolve;
        });
      },
    };
    const roller = useDiceRollerMacros(adapter, [existing]);
    const failedSave = roller.save('1d6', 'none');
    const rename = roller.rename('old', 'kept');
    rejectFirst(new Error('nope'));
    await flush();
    expect(writes).toEqual([['1d6', '1d4'], ['kept']]);
    resolveSecond();
    expect(await failedSave).toBeUndefined();
    expect(await rename).toBe(true);
    expect(roller.macros.value).toMatchObject([{ id: 'old', label: 'kept' }]);
  });
});
