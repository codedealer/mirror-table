import type { Frame } from './geometry';

/** The adapter must only return a new session-owned crop ID from upload. */
export interface CropSessionAdapter<Source> {
  resolve: (selectedId: string) => Promise<{ source: Source; frame?: Frame }>;
  upload: (source: Source, blob: Blob, frame: Frame, ratio: number) => Promise<string>;
  /** Must read back and validate both provenance and image dimensions. */
  validate: (id: string, source: Source, frame: Frame, ratio: number) => Promise<void>;
  trash: (id: string) => Promise<void>;
}

export interface CropEditTicket {
  readonly epoch: number;
  readonly selectedId: string;
}

/** Parent-owned editing session. Unknown or possibly exposed files are never trashed. */
export class CropSession<Source> {
  stagedId: string;
  committedId: string;
  pending = false;
  saving = false;
  error = '';
  cleanupFailed = false;
  private epoch = 0;
  private disposed = false;
  private drafts = new Set<string>();
  /** Once a draft can be observed by a parent, cleanup is no longer provably safe. */
  private exposed = new Set<string>();
  private inFlightApply = new Set<number>();
  private trashing = new Set<string>();
  private cleanupQueue: Promise<void> = Promise.resolve();
  private deferredParentId?: string;

  constructor(private adapter: CropSessionAdapter<Source>, committedId: string) {
    this.stagedId = committedId;
    this.committedId = committedId;
  }

  select(id: string) {
    if (this.disposed || this.saving || this.trashing.has(id))
      return false;
    this.epoch++;
    this.pending = false;
    this.stagedId = id;
    if (this.drafts.has(id))
      this.exposed.add(id);
    this.error = '';
    void this.cleanup();
    return true;
  }

  /**
   * Synchronize a parent-owned selection independently from user draft selection.
   * Parent updates arriving during persistence are deferred until its outcome settles,
   * so the displayed and persisted IDs cannot diverge while save is in flight.
   */
  syncCommitted(id: string) {
    if (this.disposed)
      return false;
    if (this.saving) {
      this.deferredParentId = id;
      return false;
    }
    this.epoch++;
    this.pending = false;
    this.stagedId = id;
    this.committedId = id;
    this.error = '';
    void this.cleanup();
    return true;
  }

  /** Reserve a generation before resolution, editor interaction, or canvas encoding starts. */
  beginEdit(): CropEditTicket | undefined {
    if (this.disposed || this.pending || this.saving)
      return;
    this.epoch++;
    this.pending = true;
    this.error = '';
    return { epoch: this.epoch, selectedId: this.stagedId };
  }

  private isCurrent(ticket: CropEditTicket) {
    return !this.disposed && this.pending && ticket.epoch === this.epoch && ticket.selectedId === this.stagedId;
  }

  async resolve(ticket: CropEditTicket) {
    if (!this.isCurrent(ticket) || this.saving)
      return;
    try {
      const result = await this.adapter.resolve(ticket.selectedId);
      if (this.isCurrent(ticket))
        return { ...result, ticket };
    } catch (e) {
      if (this.isCurrent(ticket)) {
        this.error = e instanceof Error ? e.message : 'Could not open this image.';
        this.pending = false;
      }
    }
  }

  async apply(ticket: CropEditTicket, source: Source, blob: Blob, frame: Frame, ratio: number) {
    if (!this.isCurrent(ticket) || this.saving || this.inFlightApply.has(ticket.epoch))
      return;
    this.inFlightApply.add(ticket.epoch);
    this.error = '';
    let id: string | undefined;
    try {
      id = await this.adapter.upload(source, blob, frame, ratio);
      if (!id || id === this.stagedId || id === this.committedId)
        throw new Error('The upload did not return a new crop.');
      this.drafts.add(id);
      if (!this.isCurrent(ticket))
        return;
      await this.adapter.validate(id, source, frame, ratio);
      if (!this.isCurrent(ticket))
        return;
      this.stagedId = id;
      this.exposed.add(id);
      this.pending = false;
    } catch (e) {
      if (this.isCurrent(ticket)) {
        this.error = e instanceof Error ? e.message : 'Could not apply the crop.';
        this.pending = false;
      }
    } finally {
      this.inFlightApply.delete(ticket.epoch);
      await this.cleanup();
    }
  }

  /** End an edit without committing an output (dialog cancel or decode/encode retry). */
  cancelEdit(ticket: CropEditTicket) {
    if (!this.isCurrent(ticket))
      return;
    this.epoch++;
    this.pending = false;
  }

  /** A rejected save is ambiguous: retain the selected crop even after cancel. */
  async save(commit: (id: string) => Promise<void>) {
    if (this.disposed || this.pending || this.saving)
      return false;
    this.saving = true;
    this.error = '';
    const id = this.stagedId;
    this.exposed.add(id);
    this.drafts.delete(id); // It may be exposed as soon as the parent starts saving.
    try {
      await commit(id);
      this.committedId = id;
      return true;
    } catch {
      this.error = 'Save failed or its outcome is unknown. The crop was retained.';
      return false;
    } finally {
      this.saving = false;
      if (this.deferredParentId !== undefined) {
        const parentId = this.deferredParentId;
        this.deferredParentId = undefined;
        this.syncCommitted(parentId);
      }
      await this.cleanup();
    }
  }

  cancel() {
    if (this.disposed || this.saving)
      return;
    this.epoch++;
    this.pending = false;
    this.stagedId = this.committedId;
    this.error = '';
    void this.cleanup();
  }

  dispose() {
    if (this.disposed)
      return;
    this.disposed = true;
    this.epoch++;
    this.pending = false;
    // A selected crop might already be observed by an external parent.
    this.drafts.delete(this.stagedId);
    void this.cleanup();
  }

  async cleanup() {
    const task = this.cleanupQueue.then(async () => {
      // Do not clean any draft while an upload/readback transaction could still be
      // validating a different in-flight ID. Its finally block schedules a retry.
      if (this.inFlightApply.size)
        return;
      for (const id of [...this.drafts]) {
        if (this.exposed.has(id) || (!this.disposed && id === this.stagedId))
          continue;
        this.drafts.delete(id);
        this.trashing.add(id);
        try {
          await this.adapter.trash(id);
        } catch {
          this.drafts.add(id);
          this.cleanupFailed = true;
        } finally {
          this.trashing.delete(id);
        }
      }
      if (!this.trashing.size && ![...this.drafts].some(id => this.disposed || id !== this.stagedId))
        this.cleanupFailed = false;
    });
    this.cleanupQueue = task.catch(() => {});
    await task;
  }
}
