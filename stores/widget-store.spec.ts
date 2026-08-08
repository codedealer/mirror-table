import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetNimbleGroupActorPlayerFactory } from '~/models/NimbleGroup';

const firestoreMocks = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ withConverter: vi.fn() })),
  deleteDoc: vi.fn(),
  doc: vi.fn((_collection, id) => ({ id })),
  getDoc: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: firestoreMocks.runTransaction,
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

vi.mock('@vueuse/firebase/useFirestore', () => ({
  useFirestore: vi.fn(() => ({ value: [] })),
}));

const installNuxtGlobals = () => {
  Object.assign(globalThis, {
    computed: (getter: () => unknown) => ({ get value() { return getter(); } }),
    defineStore: (_id: string, setup: () => unknown) => setup,
    firestoreDataConverter: vi.fn(),
    makeFirestoreUpdateData: vi.fn(payload => payload),
    useNotificationStore: () => ({ error: vi.fn() }),
    useNuxtApp: () => ({ $db: {} }),
    useTableStore: () => ({ mode: 'own', table: { widgets: {} } }),
    useUserStore: () => ({ user: { uid: 'user-id' } }),
  });
};

describe('widget store Nimble persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    installNuxtGlobals();
    firestoreMocks.transactionUpdate.mockReset();
    firestoreMocks.transactionGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        actors: [{
          ...WidgetNimbleGroupActorPlayerFactory('actor'),
          conditions: ['Poisoned', 'Stunned'],
        }],
      }),
    });
    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => callback({
      get: firestoreMocks.transactionGet,
      update: firestoreMocks.transactionUpdate,
    }));
  });

  it('persists ordered condition additions, removals, and actor edits', async () => {
    const { useWidgetStore } = await import('~/stores/widget-store');
    const store = useWidgetStore();

    await store.addNimbleCondition('widget-id', 'actor', ' Blinded ');
    await store.removeNimbleCondition('widget-id', 'actor', ' Poisoned ');
    await store.updateNimbleActor('widget-id', 'actor', { name: 'Updated actor' });

    expect(firestoreMocks.transactionUpdate).toHaveBeenNthCalledWith(1, expect.anything(), {
      actors: [expect.objectContaining({ conditions: ['Blinded', 'Poisoned', 'Stunned'], rank: 0 })],
    });
    expect(firestoreMocks.transactionUpdate).toHaveBeenNthCalledWith(2, expect.anything(), {
      actors: [expect.objectContaining({ conditions: ['Stunned'], rank: 0 })],
    });
    expect(firestoreMocks.transactionUpdate).toHaveBeenNthCalledWith(3, expect.anything(), {
      actors: [expect.objectContaining({ name: 'Updated actor', conditions: ['Poisoned', 'Stunned'], rank: 0 })],
    });
  });
});
