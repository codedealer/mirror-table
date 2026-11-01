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
