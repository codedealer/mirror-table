export type ParentSelectionUpdate =
  | { type: 'selected'; id: string }
  | { type: 'committed'; id: string }
  | { type: 'record'; selectedId: string; committedId: string };

export interface ParentSelectionProps {
  recordKey?: string | number;
  selectedId: string;
  committedId?: string;
}

/** Applies parent-form prop updates to the crop session in their observed order. */
interface ParentSelectionSession {
  readonly stagedId: string;
  readonly committedId: string;
  select: (id: string) => boolean;
  syncCommitted: (id: string) => boolean;
}

export class ParentSelectionSync {
  private deferred: ParentSelectionUpdate[] = [];

  constructor(
    private readonly session: ParentSelectionSession,
    private readonly isSaving: () => boolean,
    private readonly getParentSelectedId: () => string,
    private readonly cancelEdit: () => void,
    private readonly publishSelection: (id: string) => void,
  ) {}

  update(update: ParentSelectionUpdate) {
    if (this.isSaving()) {
      this.deferred.push(update);
      return false;
    }
    this.apply([update]);
    return true;
  }

  /** Replay prop changes that arrived while persistence owned the session. */
  flush() {
    this.apply(this.deferred.splice(0));
  }

  private apply(updates: ParentSelectionUpdate[]) {
    let committedChanged = false;
    for (const update of updates) {
      if (update.type === 'selected') {
        if (update.id !== this.session.stagedId) {
          this.cancelEdit();
          this.session.select(update.id);
        }
      } else if (update.type === 'record') {
        this.cancelEdit();
        this.session.syncCommitted(update.committedId);
        if (update.selectedId !== update.committedId)
          this.session.select(update.selectedId);
      } else {
        this.cancelEdit();
        this.session.syncCommitted(update.id);
        committedChanged = true;
      }
    }

    // A committed-only update also synchronizes the parent-facing staged value.
    // Publish only after ordered updates, so a later staged update is not echoed over.
    if (committedChanged && this.getParentSelectedId() !== this.session.stagedId)
      this.publishSelection(this.session.stagedId);
  }
}

/**
 * Prop-change policy used by the editable-thumbnail Vue watcher. Extracting the
 * watcher decision lets the parent/session echo rules be tested as behavior.
 */
export function observeParentSelectionProps(
  sync: ParentSelectionSync,
  current: ParentSelectionProps,
  previous: ParentSelectionProps,
  pendingEcho: { value?: string },
) {
  if (current.recordKey !== previous.recordKey) {
    pendingEcho.value = undefined;
    sync.update({
      type: 'record',
      selectedId: current.selectedId,
      committedId: current.committedId ?? current.selectedId,
    });
    return;
  }

  // A committed-value change is authoritative when both props change in one
  // parent render; selected-only changes remain staged.
  if (current.committedId !== previous.committedId && current.committedId !== undefined) {
    pendingEcho.value = undefined;
    sync.update({ type: 'committed', id: current.committedId });
    return;
  }

  if (current.selectedId !== previous.selectedId) {
    if (pendingEcho.value === current.selectedId) {
      pendingEcho.value = undefined;
    } else {
      pendingEcho.value = undefined;
      sync.update({ type: 'selected', id: current.selectedId });
    }
  }
}
