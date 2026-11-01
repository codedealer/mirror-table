import type { Frame } from './geometry';
import { validFrame } from './geometry';

export type { Frame } from './geometry';

/** Local-only model for the prototype. IDs and revisions simulate a remote repository. */
export interface MockImage {
  id: string;
  name: string;
  blob: Blob;
  revision: number;
  originalId?: string;
  originalRevision?: number;
  frame?: Frame;
  ratio?: number;
}

export class MockImageRepository {
  private files = new Map<string, MockImage>();
  private nextId = 1;

  add(name: string, blob: Blob, crop?: { originalId: string; originalRevision: number; frame: Frame; ratio?: number }) {
    const image: MockImage = { id: `mock-${this.nextId++}`, name, blob, revision: 1, ...crop };
    this.files.set(image.id, image);
    return image;
  }

  get(id: string) { return this.files.get(id); }
  remove(id: string) { this.files.delete(id); }
  change(id: string) {
    const image = this.files.get(id);
    if (image)
      image.revision++;
  }

  resolve(id: string) {
    const selected = this.get(id);
    if (!selected)
      throw new Error('The selected image is missing.');
    if (!selected.originalId)
      return { original: selected, frame: undefined };
    const original = this.get(selected.originalId);
    if (!original)
      throw new Error('The Original is missing. The existing crop is still available; select another image to edit.');
    if (original.revision !== selected.originalRevision)
      throw new Error('The Original has changed. The existing crop is still available; select another image to edit.');
    if (!selected.frame || !validFrame(selected.frame))
      throw new Error('The stored frame is invalid; the existing crop remains available.');
    return { original, frame: selected.frame };
  }
}

export { makeFrame, maxZoom, outputSize, validFrame } from './geometry';

export { isAnimated } from './media';
