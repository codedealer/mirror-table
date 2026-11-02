import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: firestoreMocks.doc,
  onSnapshot: firestoreMocks.onSnapshot,
  setDoc: firestoreMocks.setDoc,
  updateDoc: firestoreMocks.updateDoc,
}));
vi.mock('pinia', () => ({
  acceptHMRUpdate: vi.fn(),
  defineStore: (_id: string, setup: () => unknown) => setup,
  skipHydrate: (value: unknown) => value,
}));
vi.mock('~/stores/google-auth-store', () => ({
  useGoogleAuthStore: () => ({ authorizationInfo: { value: { accessToken: '', expiry: 0 } } }),
}));

interface TestProfile {
  settings: {
    driveFolderId: string;
    searchFolderId: string;
    lastVisibleRootFolderId?: string;
    diceRoller?: { savedMacros?: Array<{ id: string; expression: string }> };
  };
}

const profile = (id: string): TestProfile => ({
  settings: {
    driveFolderId: `${id}-drive`,
    searchFolderId: `${id}-search`,
    diceRoller: { savedMacros: [{ id: `${id}-macro`, expression: `${id}-macro` }] },
  },
});

describe('user profile auth transition isolation', () => {
  let authCallback!: (user: { uid: string; getIdToken: () => Promise<string> } | null) => void;
  let snapshots: Array<(snapshot: { exists: () => boolean; data: () => TestProfile; metadata: { fromCache: boolean } }) => void>;

  beforeEach(() => {
    vi.resetModules();
    snapshots = [];
    firestoreMocks.doc.mockImplementation((_collection: string, uid: string) => ({ uid, withConverter: vi.fn().mockReturnThis() }));
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _options: unknown, callback: typeof snapshots[number]) => {
      snapshots.push(callback);
      return vi.fn();
    });
    const auth = {
      onAuthStateChanged: (callback: typeof authCallback) => { authCallback = callback; },
    };
    Object.assign(globalThis, {
      ref: <T>(value: T) => ({ value }),
      computed: (getter: () => unknown) => ({ get value() { return getter(); } }),
      useCookie: <T>(_: string) => ({ value: null as T | null }),
      useNuxtApp: () => ({ $auth: auth, $db: {} }),
      storeToRefs: (store: { authorizationInfo: unknown }) => ({ authorizationInfo: store.authorizationInfo }),
      firestoreDataConverter: <T>() => ({} as T),
    });
    firestoreMocks.onSnapshot.mockClear();
  });

  it('exposes Firebase auth resolution when the initial signed-out state is confirmed', async () => {
    const { useUserStore } = await import('./user-store');
    const store = useUserStore() as unknown as {
      isAuthResolved: { value: boolean };
      user: { value: { uid: string } | null };
    };

    expect(store.isAuthResolved.value).toBe(false);
    authCallback(null);
    expect(store.isAuthResolved.value).toBe(true);
    expect(store.user.value).toBeNull();
  });

  it('clears A profile and token immediately while loading B without a page reload', async () => {
    const { useUserStore } = await import('./user-store');
    const store = useUserStore() as unknown as {
      user: { value: { uid: string } | null };
      profile: { value: TestProfile | null };
      isLoggedIn: { value: boolean };
    };
    const userA = { uid: 'user-a', getIdToken: async () => 'token-a' };
    const userB = { uid: 'user-b', getIdToken: async () => 'token-b' };

    authCallback(userA);
    await Promise.resolve();
    snapshots[0]({ exists: () => true, data: () => profile('user-a'), metadata: { fromCache: false } });
    expect(store.profile.value?.settings.diceRoller?.savedMacros).toEqual([{ id: 'user-a-macro', expression: 'user-a-macro' }]);

    authCallback(userB);
    expect(store.user.value?.uid).toBe('user-b');
    expect(store.profile.value).toBeNull();
    expect(store.isLoggedIn.value).toBe(false);
    // This is the same readiness guard used by DiceRoller.vue's production
    // adapter: no macro list is exposed while B's profile is unresolved.
    expect(store.profile.value?.settings.diceRoller?.savedMacros ?? []).toEqual([]);

    // A's queued callback cannot repopulate the now-B session.
    snapshots[0]({ exists: () => true, data: () => profile('user-a'), metadata: { fromCache: false } });
    expect(store.profile.value).toBeNull();
    await Promise.resolve();

    snapshots[1]({ exists: () => true, data: () => profile('user-b'), metadata: { fromCache: false } });
    expect(store.profile.value?.settings.diceRoller?.savedMacros).toEqual([{ id: 'user-b-macro', expression: 'user-b-macro' }]);
    await Promise.resolve();
    expect(store.isLoggedIn.value).toBe(true);
  });

  it('writes the visible-root preference through the nested profile settings field', async () => {
    const { useUserStore } = await import('./user-store');
    const store = useUserStore() as unknown as {
      updateProfileSettings: (settings: Partial<TestProfile['settings']>) => Promise<void>;
    };
    authCallback({ uid: 'user-a', getIdToken: async () => 'token-a' });
    await Promise.resolve();

    await store.updateProfileSettings({ lastVisibleRootFolderId: 'folder-a' });

    expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'users', 'user-a');
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { 'settings.lastVisibleRootFolderId': 'folder-a' },
    );
  });

  it('rejects delayed callbacks from an earlier generation after A to B to A', async () => {
    const { useUserStore } = await import('./user-store');
    const store = useUserStore() as unknown as {
      user: { value: { uid: string } | null };
      profile: { value: TestProfile | null };
      isLoggedIn: { value: boolean };
    };
    let resolveFirstToken!: (token: string) => void;
    let resolveCurrentToken!: (token: string) => void;
    const firstToken = new Promise<string>((resolve) => {
      resolveFirstToken = resolve;
    });
    const currentToken = new Promise<string>((resolve) => {
      resolveCurrentToken = resolve;
    });
    const userAFirst = { uid: 'user-a', getIdToken: () => firstToken };
    const userB = { uid: 'user-b', getIdToken: async () => 'token-b' };
    const userACurrent = { uid: 'user-a', getIdToken: () => currentToken };

    authCallback(userAFirst);
    authCallback(userB);
    authCallback(userACurrent);
    expect(store.user.value?.uid).toBe('user-a');
    expect(store.profile.value).toBeNull();
    expect(store.isLoggedIn.value).toBe(false);

    // Stale token requests must not start listeners even when UID A matches the
    // current user again.
    resolveFirstToken('stale-token-a');
    await Promise.resolve();
    expect(firestoreMocks.onSnapshot).not.toHaveBeenCalled();
    expect(store.profile.value).toBeNull();
    expect(store.isLoggedIn.value).toBe(false);

    resolveCurrentToken('token-a-current');
    await Promise.resolve();
    snapshots[0]({ exists: () => true, data: () => profile('user-a-current'), metadata: { fromCache: false } });
    expect(store.profile.value?.settings.diceRoller?.savedMacros).toEqual([{ id: 'user-a-current-macro', expression: 'user-a-current-macro' }]);
    expect(store.isLoggedIn.value).toBe(true);
  });
});
