import type { Frame } from './geometry';
import type { CropEditTicket } from './session';

interface CropSessionBoundary<Source> {
  stagedId: string;
  beginEdit: () => CropEditTicket | undefined;
  resolve: (ticket: CropEditTicket) => Promise<{ source: Source; frame?: Frame; ticket: CropEditTicket } | undefined>;
  cancelEdit: (ticket: CropEditTicket) => void;
  apply: (ticket: CropEditTicket, source: Source, blob: Blob, frame: Frame, ratio: number) => Promise<void>;
}

/** Shared editor/parent interaction boundary used by the Drive wrapper and local harness. */
export class CropInteraction<Source> {
  ticket?: CropEditTicket;
  source?: Source;
  initialFrame?: Frame;

  constructor(private session: CropSessionBoundary<Source>) {}

  async begin() {
    const current = this.session.beginEdit();
    if (!current)
      return;
    this.ticket = current;
    this.source = undefined;
    this.initialFrame = undefined;
    const resolved = await this.session.resolve(current);
    if (this.ticket !== current || !resolved)
      return;
    this.source = resolved.source;
    this.initialFrame = resolved.frame;
    return { ticket: current, source: resolved.source, frame: resolved.frame };
  }

  cancel() {
    if (this.ticket)
      this.session.cancelEdit(this.ticket);
    this.ticket = undefined;
    this.source = undefined;
    this.initialFrame = undefined;
  }

  async apply(blob: Blob, frame: Frame, ratio: number) {
    const current = this.ticket;
    const currentSource = this.source;
    if (!current || currentSource === undefined)
      return false;
    const previousId = this.session.stagedId;
    await this.session.apply(current, currentSource, blob, frame, ratio);
    // Selection/replacement/new edit supersedes any late completion from this editor.
    if (this.ticket !== current)
      return false;
    this.ticket = undefined;
    this.source = undefined;
    this.initialFrame = undefined;
    return this.session.stagedId !== previousId;
  }
}
