import type { CropSessionAdapter } from './session';
import { describe, expect, it, vi } from 'vitest';
import { CropInteraction } from './interaction';
import { CropSession } from './session';

const frame = { x: 0, y: 0, w: 1_000_000, h: 1_000_000 };
const blob = new Blob(['crop']);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function setup() {
  const adapter: CropSessionAdapter<string> = {
    resolve: vi.fn(async () => ({ source: 'original' })),
    upload: vi.fn(async () => 'crop'),
    validate: vi.fn(async () => {}),
    trash: vi.fn(async () => {}),
  };
  return { adapter, session: new CropSession(adapter, 'original') };
}
const apply = (session: CropSession<string>) => session.apply(session.beginEdit()!, 'original', blob, frame, 1);

describe('parent crop session', () => {
  it('marks work pending before resolve/editor encoding and blocks parent save', async () => {
    const { session, adapter } = setup();
    const read = deferred<{ source: string }>();
    adapter.resolve = vi.fn(() => read.promise);
    const ticket = session.beginEdit()!;
    expect(session.pending).toBe(true);
    const resolving = session.resolve(ticket);
    expect(await session.save(async () => {})).toBe(false);
    read.resolve({ source: 'original' });
    expect((await resolving)?.ticket).toEqual(ticket);
    expect(session.pending).toBe(true);
    session.cancelEdit(ticket);
    expect(session.pending).toBe(false);
  });

  it('surfaces resolve failures, releases the reservation and allows a retry', async () => {
    const { session, adapter } = setup();
    adapter.resolve = vi.fn(async (selectedId: string) => {
      if (selectedId === 'original')
        throw new Error('The Original is missing.');
      return { source: selectedId };
    });
    const ticket = session.beginEdit()!;
    expect(await session.resolve(ticket)).toBeUndefined();
    expect(session.error).toBe('The Original is missing.');
    expect(session.pending).toBe(false);
    // A failed edit does not wedge the session; a fresh edit can begin.
    session.select('replacement');
    const retry = session.beginEdit()!;
    expect(retry).toBeDefined();
    expect((await session.resolve(retry))?.source).toBe('replacement');
    expect(session.error).toBe('');
    expect(session.pending).toBe(true);
    session.cancelEdit(retry);
    expect(session.pending).toBe(false);
  });

  it('stages only after metadata validation and blocks duplicate apply and parent save', async () => {
    const { session, adapter } = setup();
    const read = deferred<void>();
    adapter.validate = vi.fn(() => read.promise);
    const ticket = session.beginEdit()!;
    const applying = session.apply(ticket, 'original', blob, frame, 1);
    await Promise.resolve();
    expect(session.stagedId).toBe('original');
    expect(await session.save(async () => {})).toBe(false);
    await session.apply(ticket, 'original', blob, frame, 1);
    expect(adapter.upload).toHaveBeenCalledTimes(1);
    read.resolve();
    await applying;
    expect(session.pending).toBe(false);
    expect(session.stagedId).toBe('crop');
    expect(await session.save(async () => {})).toBe(true);
    session.cancel();
    await session.cleanup();
    expect(session.stagedId).toBe('crop');
    expect(adapter.trash).not.toHaveBeenCalled();
  });

  it('retains the prior selection on readback failure, cleans the draft and allows retry', async () => {
    const { session, adapter } = setup();
    adapter.validate = vi.fn().mockRejectedValueOnce(new Error('Readback failed')).mockResolvedValue(undefined);
    await apply(session);
    expect(session.stagedId).toBe('original');
    expect(session.error).toBe('Readback failed');
    expect(adapter.trash).toHaveBeenCalledWith('crop');
    await apply(session);
    expect(session.stagedId).toBe('crop');
  });

  it('ignores a stale upload after cancellation or replacement and cleans only its known draft', async () => {
    for (const action of ['cancel', 'replace', 'dispose'] as const) {
      const { session, adapter } = setup();
      const upload = deferred<string>();
      adapter.upload = vi.fn(() => upload.promise);
      const ticket = session.beginEdit()!;
      const applying = session.apply(ticket, 'original', blob, frame, 1);
      if (action === 'replace')
        session.select('other-original');
      else
        session[action]();
      upload.resolve('late-crop');
      await applying;
      expect(session.stagedId).toBe(action === 'replace' ? 'other-original' : 'original');
      expect(adapter.validate).not.toHaveBeenCalled();
      expect(adapter.trash).toHaveBeenCalledWith('late-crop');
      expect(adapter.trash).not.toHaveBeenCalledWith('original');
    }
  });

  it('does not accept an editor result from a replaced or cancelled selection generation', async () => {
    for (const action of ['cancel', 'replace'] as const) {
      const { session, adapter } = setup();
      const oldTicket = session.beginEdit()!;
      action === 'cancel' ? session.cancel() : session.select('replacement');
      const replacementId = session.stagedId;
      await session.apply(oldTicket, 'original', blob, frame, 1);
      expect(session.stagedId).toBe(replacementId);
      expect(adapter.upload).not.toHaveBeenCalled();
      expect(adapter.trash).not.toHaveBeenCalled();
    }
  });

  it('retains a crop after an ambiguous parent save, even after cancellation', async () => {
    const { session, adapter } = setup();
    await apply(session);
    expect(await session.save(async () => {
      throw new Error('timeout');
    })).toBe(false);
    session.cancel();
    await session.cleanup();
    expect(session.stagedId).toBe('original');
    expect(adapter.trash).not.toHaveBeenCalled();
  });

  it('awaits parent persistence and retains files on uncertain outcomes', async () => {
    const { session } = setup();
    await apply(session);
    const commit = deferred<void>();
    const saving = session.save(() => commit.promise);
    expect(session.saving).toBe(true);
    expect(session.select('other')).toBe(false);
    expect(session.stagedId).toBe('crop');
    commit.resolve();
    expect(await saving).toBe(true);
    expect(session.committedId).toBe('crop');
  });

  it('keeps staged parent selections independent from committed values and saves the callback ID', async () => {
    const { session } = setup();
    session.select('initial-staged-image');
    expect(session.stagedId).toBe('initial-staged-image');
    expect(session.committedId).toBe('original');

    // Parent-driven selectedId updates stage only; a form reset restores the
    // previous committed selection without changing persistence ownership.
    session.select('parent-staged-image');
    expect(session.stagedId).toBe('parent-staged-image');
    expect(session.committedId).toBe('original');
    session.cancel();
    expect(session.stagedId).toBe('original');
    expect(session.committedId).toBe('original');

    // A committed-value update is authoritative and synchronizes both values.
    expect(session.syncCommitted('parent-committed-image')).toBe(true);
    expect(session.stagedId).toBe('parent-committed-image');
    expect(session.committedId).toBe('parent-committed-image');

    session.select('callback-authoritative-image');
    let persistedId = '';
    const failure = await session.save(async (id) => {
      persistedId = id;
      throw new Error('persistence failed');
    });
    expect(failure).toBe(false);
    expect(persistedId).toBe('callback-authoritative-image');
    expect(session.stagedId).toBe('callback-authoritative-image');
    expect(session.committedId).toBe('parent-committed-image');

    const success = await session.save(async (id) => {
      persistedId = id;
    });
    expect(success).toBe(true);
    expect(persistedId).toBe('callback-authoritative-image');
    expect(session.stagedId).toBe('callback-authoritative-image');
    expect(session.committedId).toBe('callback-authoritative-image');
  });

  it('synchronizes asynchronous parent loads and reused record state as committed values', () => {
    const { session } = setup();
    expect(session.committedId).toBe('original');
    expect(session.syncCommitted('loaded-record-image')).toBe(true);
    expect(session.stagedId).toBe('loaded-record-image');
    expect(session.committedId).toBe('loaded-record-image');

    session.select('unsaved-parent-draft');
    expect(session.syncCommitted('next-record-image')).toBe(true);
    expect(session.stagedId).toBe('next-record-image');
    session.cancel();
    expect(session.stagedId).toBe('next-record-image');
  });

  it('defers external committed changes during save and rejects competing selections', async () => {
    const { session } = setup();
    await apply(session);
    const persistence = deferred<void>();
    let persistedId = '';
    const saving = session.save(async (id) => {
      persistedId = id;
      await persistence.promise;
    });
    expect(session.select('picker-result')).toBe(false);
    expect(session.syncCommitted('new-parent-record')).toBe(false);
    expect(session.stagedId).toBe('crop');
    persistence.resolve();
    expect(await saving).toBe(true);
    expect(persistedId).toBe('crop');
    expect(session.stagedId).toBe('new-parent-record');
    expect(session.committedId).toBe('new-parent-record');
  });

  it('protects another active upload validation from cleanup after an overlapping stale completion', async () => {
    const { session, adapter } = setup();
    const oldUpload = deferred<string>();
    const newValidation = deferred<void>();
    adapter.resolve = vi.fn(async selectedId => ({ source: selectedId }));
    adapter.upload = vi.fn(async source => source === 'A' ? oldUpload.promise : 'crop-B');
    adapter.validate = vi.fn(async (id, source) => id === 'crop-B' && source === 'B' ? newValidation.promise : undefined);
    const interaction = new CropInteraction(session);
    session.select('A');

    const openedA = await interaction.begin();
    expect(openedA?.source).toBe('A');
    const applyingA = interaction.apply(blob, frame, 1);
    session.select('B');
    const openedB = await interaction.begin();
    expect(openedB?.source).toBe('B');
    const applyingB = interaction.apply(blob, frame, 1);
    await Promise.resolve();
    expect(adapter.validate).toHaveBeenCalledWith('crop-B', 'B', frame, 1);

    oldUpload.resolve('crop-A');
    await applyingA;
    expect(adapter.trash).not.toHaveBeenCalledWith('crop-B');
    expect(interaction.source).toBe('B');
    expect(session.stagedId).toBe('B');

    newValidation.resolve();
    await applyingB;
    expect(session.stagedId).toBe('crop-B');
    expect(adapter.trash).toHaveBeenCalledWith('crop-A');
    expect(adapter.trash).not.toHaveBeenCalledWith('crop-B');
  });

  it('keeps new editor state when a replaced editor finishes late', async () => {
    const { session, adapter } = setup();
    const oldUpload = deferred<string>();
    adapter.resolve = vi.fn(async selectedId => ({ source: selectedId }));
    adapter.upload = vi.fn(async source => source === 'original' ? oldUpload.promise : 'new-crop');
    const interaction = new CropInteraction(session);
    const first = await interaction.begin();
    expect(first).toBeDefined();
    const applyingOld = interaction.apply(blob, frame, 1);
    session.select('replacement');
    const second = await interaction.begin();
    expect(second).toBeDefined();
    const currentTicket = interaction.ticket;
    const currentSource = interaction.source;
    oldUpload.resolve('late-crop');
    await applyingOld;
    expect(interaction.ticket).toBe(currentTicket);
    expect(interaction.source).toBe(currentSource);
    expect(session.stagedId).toBe('replacement');
    expect(adapter.trash).toHaveBeenCalledWith('late-crop');
  });

  it('does not publish parent save success before persistence and preserves failed drafts for retry', async () => {
    const { session } = setup();
    await apply(session);
    const publish = vi.fn();
    let committed = 'original';
    const failed = await session.save(async (id) => {
      throw new Error(`persist failed for ${id}`);
    });
    if (failed)
      publish(session.committedId);
    expect(failed).toBe(false);
    expect(publish).not.toHaveBeenCalled();
    expect(committed).toBe('original');
    expect(session.stagedId).toBe('crop');
    expect(session.error).toMatch(/outcome is unknown/);

    const succeeded = await session.save(async (id) => {
      await Promise.resolve();
      committed = id;
    });
    if (succeeded)
      publish(session.committedId);
    expect(succeeded).toBe(true);
    expect(committed).toBe('crop');
    expect(publish).toHaveBeenCalledWith('crop');
    expect(session.error).toBe('');
  });

  it('retains failed cleanup and allows retry without deleting an original', async () => {
    const { session, adapter } = setup();
    adapter.validate = vi.fn().mockRejectedValueOnce(new Error('invalid readback'));
    adapter.trash = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    await apply(session);
    expect(session.stagedId).toBe('original');
    expect(session.cleanupFailed).toBe(true);
    await session.cleanup();
    expect(adapter.trash).toHaveBeenCalledTimes(2);
    expect(adapter.trash).not.toHaveBeenCalledWith('original');
  });

  it('never trashes a draft once its ID has been exposed to the parent', async () => {
    const { session, adapter } = setup();
    await apply(session);
    const exposedDraft = session.stagedId;
    session.select('replacement');
    await session.cleanup();
    expect(adapter.trash).not.toHaveBeenCalledWith(exposedDraft);
  });

  it('stages an empty selection for removal and retains exposed drafts and committed images', async () => {
    const { session, adapter } = setup();
    await apply(session);
    const crop = session.stagedId;
    // The wrapper's remove action stages an empty selection like any pick.
    expect(session.select('')).toBe(true);
    expect(session.stagedId).toBe('');
    await session.cleanup();
    // The applied crop was exposed to the parent and the Original is never a draft.
    expect(adapter.trash).not.toHaveBeenCalledWith(crop);
    expect(adapter.trash).not.toHaveBeenCalledWith('original');
    let committed = 'kept';
    expect(await session.save(async (id) => {
      committed = id;
    })).toBe(true);
    expect(committed).toBe('');
    expect(session.committedId).toBe('');
  });
});
