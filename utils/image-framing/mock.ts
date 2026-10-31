/** Local-only model for the prototype. IDs and revisions simulate a remote repository. */
export interface Frame { x: number; y: number; w: number; h: number }
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

export function validFrame(f: Frame) {
  return [f.x, f.y, f.w, f.h].every(Number.isInteger) && f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0 && f.x + f.w <= 1_000_000 && f.y + f.h <= 1_000_000;
}

/** A cover crop in source pixels, then quantised to orientation-corrected millionths. */
export function makeFrame(width: number, height: number, ratio: number, zoom: number, centerX: number, centerY: number): Frame {
  const baseWidth = Math.min(width, height * ratio);
  const baseHeight = baseWidth / ratio;
  // Round outward so quantisation never removes source pixels at the zoom limit.
  const w = Math.max(1, Math.min(1_000_000, Math.ceil(baseWidth / zoom / width * 1_000_000)));
  const h = Math.max(1, Math.min(1_000_000, Math.ceil(baseHeight / zoom / height * 1_000_000)));
  const x = Math.max(0, Math.min(1_000_000 - w, Math.round(centerX * 1_000_000 - w / 2)));
  const y = Math.max(0, Math.min(1_000_000 - h, Math.round(centerY * 1_000_000 - h / 2)));
  return { x, y, w, h };
}

export function maxZoom(width: number, height: number, ratio: number) {
  if (ratio !== 1 && ratio !== 2)
    throw new Error('Unsupported frame ratio.');
  const baseWidth = Math.min(width, height * ratio);
  // A null limit means even the initial cover crop cannot supply the target.
  const limit = Math.min(8, baseWidth / 512);
  return limit < 1 ? null : limit;
}

export function outputSize(width: number, height: number, frame: Frame, ratio: number) {
  if (ratio !== 1 && ratio !== 2)
    throw new Error('Unsupported frame ratio.');
  const availableWidth = width * frame.w / 1_000_000;
  const availableHeight = height * frame.h / 1_000_000;
  return availableWidth >= 512 && availableHeight >= 512 / ratio
    ? { width: 512, height: 512 / ratio }
    : null;
}

/** Identify APNG and animated WebP before handing bytes to the browser decoder. */
export async function isAnimated(blob: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 12 && text(1, 3) === 'PNG') {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = data.getUint32(offset);
      if (length > bytes.length - offset - 12)
        break;
      if (text(offset + 4, 4) === 'acTL')
        return true;
      offset += length + 12;
    }
  }
  if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const length = data.getUint32(offset + 4, true);
      if (length > bytes.length - offset - 8)
        break;
      if (text(offset, 4) === 'ANIM' || text(offset, 4) === 'ANMF')
        return true;
      offset += 8 + length + (length % 2);
    }
  }
  return false;
}
