import type { CropSessionAdapter } from './session';
import { describe, expect, it, vi } from 'vitest';
import { observeParentSelectionProps, ParentSelectionSync } from './parentSelection';
import { CropSession } from './session';

function setup() {
  const adapter: CropSessionAdapter<string> = {
    resolve: async id => ({ source: id }),
    upload: async () => 'crop',
    validate: async () => {},
    trash: async () => {},
  };
  const session = new CropSession(adapter, 'committed-A');
  let parentSelectedId = 'staged-B';
  session.select(parentSelectedId);
  const publish = vi.fn((id: string) => {
    parentSelectedId = id;
  });
  const cancelEdit = vi.fn();
  const sync = new ParentSelectionSync(
    session,
    () => session.saving,
    () => parentSelectedId,
    cancelEdit,
    publish,
  );
  return { session, sync, publish, cancelEdit, getParentSelectedId: () => parentSelectedId };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

describe('editable thumbnail parent selection synchronization', () => {
  it('retains distinct initial selections, stages parent changes, and publishes committed-only updates', () => {
    const { session, sync, publish, getParentSelectedId } = setup();
    expect(session.stagedId).toBe('staged-B');
    expect(session.committedId).toBe('committed-A');

    sync.update({ type: 'selected', id: 'staged-C' });
    expect(session.stagedId).toBe('staged-C');
    expect(session.committedId).toBe('committed-A');

    sync.update({ type: 'committed', id: 'committed-D' });
    expect(session.stagedId).toBe('committed-D');
    expect(session.committedId).toBe('committed-D');
    expect(getParentSelectedId()).toBe('committed-D');
    expect(publish).toHaveBeenLastCalledWith('committed-D');

    // Parent reset is represented by selecting the authoritative committed ID.
    sync.update({ type: 'selected', id: 'draft-E' });
    sync.update({ type: 'selected', id: session.committedId });
    expect(session.stagedId).toBe('committed-D');
    expect(session.committedId).toBe('committed-D');
  });

  it('applies actual wrapper prop and echo policy for staged, committed, reset, and reused-record changes', () => {
    const { session, sync, publish } = setup();
    const echo: { value?: string } = {};
    const initial = { recordKey: 'record-1', selectedId: 'staged-B', committedId: 'committed-A' };

    // A child selection already changed the session; its parent echo must not
    // be treated as another external staged update.
    sync.update({ type: 'selected', id: 'staged-C' });
    echo.value = 'staged-C';
    const childEcho = { ...initial, selectedId: 'staged-C' };
    observeParentSelectionProps(sync, childEcho, initial, echo);
    expect(session.stagedId).toBe('staged-C');
    expect(session.committedId).toBe('committed-A');
    expect(echo.value).toBeUndefined();

    const parentStaged = { ...childEcho, selectedId: 'staged-D' };
    observeParentSelectionProps(sync, parentStaged, childEcho, echo);
    expect(session.stagedId).toBe('staged-D');
    expect(session.committedId).toBe('committed-A');

    const parentCommitted = { ...parentStaged, committedId: 'committed-E' };
    observeParentSelectionProps(sync, parentCommitted, parentStaged, echo);
    expect(session.stagedId).toBe('committed-E');
    expect(session.committedId).toBe('committed-E');
    expect(publish).toHaveBeenLastCalledWith('committed-E');

    const reset = { ...parentCommitted, selectedId: 'committed-E' };
    observeParentSelectionProps(sync, reset, parentCommitted, echo);
    expect(session.stagedId).toBe('committed-E');

    const nextRecord = { recordKey: 'record-2', selectedId: 'new-staged', committedId: 'new-committed' };
    observeParentSelectionProps(sync, nextRecord, reset, echo);
    expect(session.stagedId).toBe('new-staged');
    expect(session.committedId).toBe('new-committed');
  });

  it('initializes reused records with independent staged and committed IDs', () => {
    const { session, sync } = setup();
    sync.update({ type: 'record', selectedId: 'new-record-staged', committedId: 'new-record-saved' });
    expect(session.stagedId).toBe('new-record-staged');
    expect(session.committedId).toBe('new-record-saved');
    session.cancel();
    expect(session.stagedId).toBe('new-record-saved');
    expect(session.committedId).toBe('new-record-saved');

    sync.update({ type: 'record', selectedId: 'same-staged-id', committedId: 'first-commit' });
    sync.update({ type: 'record', selectedId: 'same-staged-id', committedId: 'second-commit' });
    expect(session.stagedId).toBe('same-staged-id');
    expect(session.committedId).toBe('second-commit');
  });

  it.each([true, false])('replays ordered parent changes after %s persistence', async (succeeds) => {
    const { session, sync, getParentSelectedId } = setup();
    const persistence = deferred<void>();
    let persistedId = '';
    const saving = session.save(async (id) => {
      persistedId = id;
      await persistence.promise;
      if (!succeeds)
        throw new Error('store returned false');
    });

    expect(sync.update({ type: 'selected', id: 'parent-staged' })).toBe(false);
    expect(sync.update({ type: 'committed', id: 'parent-committed' })).toBe(false);
    expect(session.stagedId).toBe('staged-B');
    persistence.resolve();
    expect(await saving).toBe(succeeds);
    sync.flush();

    expect(persistedId).toBe('staged-B');
    expect(session.stagedId).toBe('parent-committed');
    expect(session.committedId).toBe('parent-committed');
    expect(getParentSelectedId()).toBe('parent-committed');
  });

  it.each([true, false])('preserves a parent staging change during %s persistence', async (succeeds) => {
    const { session, sync } = setup();
    const persistence = deferred<void>();
    const saving = session.save(async () => {
      await persistence.promise;
      if (!succeeds)
        throw new Error('store returned false');
    });
    expect(sync.update({ type: 'selected', id: 'latest-parent-stage' })).toBe(false);
    persistence.resolve();
    expect(await saving).toBe(succeeds);
    sync.flush();
    expect(session.stagedId).toBe('latest-parent-stage');
    expect(session.committedId).toBe(succeeds ? 'staged-B' : 'committed-A');
  });

  it('lets a selected update after a committed update remain staged', () => {
    const { session, sync } = setup();
    const persistence = deferred<void>();
    const saving = session.save(() => persistence.promise);
    sync.update({ type: 'committed', id: 'parent-committed' });
    sync.update({ type: 'selected', id: 'newer-parent-draft' });
    persistence.resolve();
    return saving.then(() => {
      sync.flush();
      expect(session.committedId).toBe('parent-committed');
      expect(session.stagedId).toBe('newer-parent-draft');
    });
  });

  it('publishes an authoritative empty reconciliation during parent loading', async () => {
    const { session, sync, publish, getParentSelectedId } = setup();
    const persistence = deferred<void>();
    const saving = session.save(() => persistence.promise);
    sync.update({ type: 'committed', id: '' });
    expect(session.stagedId).toBe('staged-B');

    persistence.resolve();
    await saving;
    sync.flush();

    // Parent form event handlers must accept this synchronization even though
    // their Save operation is still in its loading phase.
    expect(publish).toHaveBeenLastCalledWith('');
    expect(getParentSelectedId()).toBe('');
    expect(session.stagedId).toBe('');
    expect(session.committedId).toBe('');
  });
});
