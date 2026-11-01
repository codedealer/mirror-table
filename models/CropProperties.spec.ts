import type { CropProperties, DriveFileRaw } from '~/models/types';
import type { Frame } from '~/utils/image-framing/geometry';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCropProvenance, isCropProperties, parseCropProperties, serializeCropProperties } from '~/models/CropProperties';
import { isCropRectangle } from '~/models/CropRectangle';
import { convertToDriveFile } from '~/models/DriveFile';
import { serializeAppProperties, validatePayloadSize } from '~/utils/appPropertiesSerializer';
import { uploadCropMedia, uploadRawMedia } from '~/utils/driveOps';
import { validFrame } from '~/utils/image-framing/geometry';

const crop: CropProperties = {
  type: 'dependency',
  kind: 'c',
  originalId: 'original_ID-1',
  checksum: 'a'.repeat(32),
  rectangle: { x: 100, y: 200, w: 999900, h: 999800 },
};
const wire = { type: 'dependency', k: 'c', o: crop.originalId, m: crop.checksum, c: '1,100,200,999900,999800' };
const rawFile = (appProperties?: Record<string, string>, properties?: Record<string, string>): DriveFileRaw => ({
  id: 'crop',
  name: 'image',
  trashed: false,
  ownedByMe: true,
  originalFilename: 'image',
  shared: false,
  thumbnailLink: 'https://example.test/thumbnail',
  appProperties,
  properties,
});

describe('drive crop provenance contract', () => {
  it('shares millionth-coordinate rectangle boundaries between model and editor geometry', () => {
    const validRectangles = [
      { x: 0, y: 0, w: 1_000_000, h: 1_000_000 },
      { x: 999_999, y: 999_999, w: 1, h: 1 },
      { x: 200, y: 300, w: 999_800, h: 999_700 },
    ];
    const invalidRectangles: unknown[] = [
      { x: -1, y: 0, w: 1, h: 1 },
      { x: 0, y: -1, w: 1, h: 1 },
      { x: 0, y: 0, w: 0, h: 1 },
      { x: 0, y: 0, w: 1, h: 0 },
      { x: 1_000_000, y: 0, w: 1, h: 1 },
      { x: 0, y: 1_000_000, w: 1, h: 1 },
      { x: 0, y: 0, w: 1_000_001, h: 1 },
      { x: 0, y: 0, w: 1, h: 1.5 },
      { x: Number.MAX_SAFE_INTEGER + 1, y: 0, w: 1, h: 1 },
      null,
      [],
    ];

    for (const rectangle of validRectangles) {
      expect(isCropRectangle(rectangle)).toBe(true);
      expect(validFrame(rectangle as Frame)).toBe(true);
    }
    for (const rectangle of invalidRectangles) {
      expect(isCropRectangle(rectangle)).toBe(false);
      expect(validFrame(rectangle as Frame)).toBe(false);
    }
  });

  it('round-trips through conversion and serialization, retaining marker and thumbnail', () => {
    const raw = rawFile(wire, { mtc: '1' });
    const file = convertToDriveFile(raw);
    expect(file.cropProvenance).toEqual({ status: 'usable', properties: crop });
    expect(file.thumbnailLink).toBe(raw.thumbnailLink);
    expect(file.properties).toEqual({ mtc: '1' });
    expect(serializeAppProperties(file.appProperties)).toEqual(wire);
    expect(raw.appProperties).toEqual(wire);
    expect(isCropProperties(file.appProperties)).toBe(true);
  });

  it('keeps marked or malformed dependency images displayable but not editable', () => {
    for (const app of [undefined, { ...wire, c: '2,0,0,1,1' }, { type: 'dependency' }, { type: 'unknown' }]) {
      const file = convertToDriveFile(rawFile(app, { mtc: '1' }));
      expect(file.cropProvenance).toEqual({ status: 'unavailable' });
      expect(file.thumbnailLink).toBe('https://example.test/thumbnail');
      expect(file.appProperties).toBeUndefined();
    }
    expect(convertToDriveFile(rawFile({ ...wire, m: 'bad' })).cropProvenance).toEqual({ status: 'unavailable' });
    expect(convertToDriveFile(rawFile()).cropProvenance).toEqual({ status: 'original' });
    expect(getCropProvenance(wire, undefined).status).toBe('usable');
  });

  it('does not interpret incompatible marked properties as assets or widgets', () => {
    const corruptAsset = { type: 'asset', kind: 'image', preview: 'not-json' };
    const markedAsset = convertToDriveFile(rawFile(corruptAsset, { mtc: '1' }));
    expect(markedAsset.cropProvenance).toEqual({ status: 'unavailable' });
    expect(markedAsset.appProperties).toBeUndefined();
    expect(markedAsset.thumbnailLink).toBe('https://example.test/thumbnail');

    const markedWidget = convertToDriveFile(rawFile({ type: 'widget', template: 'markdown', title: 'Title' }, { mtc: '1' }));
    expect(markedWidget.cropProvenance).toEqual({ status: 'unavailable' });
    expect(markedWidget.appProperties).toBeUndefined();
    expect(markedWidget.thumbnailLink).toBe('https://example.test/thumbnail');

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => convertToDriveFile(rawFile(corruptAsset))).toThrow('Invalid JSON object');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('validates version, identifiers, checksums, and canonical bounded integer rectangles', () => {
    for (const c of ['2,0,0,1,1', '1,0,0,0,1', '1,0,0,1,0', '1,1000000,0,1,1', '1,0,1000000,1,1', '1,-1,0,1,1', '1,0,0,1000001,1', '1,0,0,1.0,1', '1,00,0,1,1', '1,0,0,1,1,2', '1,0,0,1e2,1', '1,0,0,999999999999999999999,1']) {
      expect(parseCropProperties({ ...wire, c }), c).toBeUndefined();
    }
    expect(parseCropProperties({ ...wire, c: '1,0,0,1000000,1000000' })).toBeDefined();
    expect(parseCropProperties({ ...wire, c: '1,999999,999999,1,1' })).toBeDefined();
    for (const o of ['', 'a/b', 'a b', 'a'.repeat(124)]) expect(parseCropProperties({ ...wire, o })).toBeUndefined();
    for (const m of ['', 'A'.repeat(32), 'a'.repeat(31), 'g'.repeat(32)]) expect(parseCropProperties({ ...wire, m })).toBeUndefined();
    expect(() => serializeCropProperties({ ...crop, rectangle: { ...crop.rectangle, w: 0 } })).toThrow();
    expect(() => serializeCropProperties({ ...crop, originalId: 'x'.repeat(124) })).toThrow();
    expect(serializeCropProperties({ ...crop, originalId: 'x'.repeat(123) }).o).toHaveLength(123);
  });

  it('counts UTF-8 bytes for both key and value', () => {
    expect(() => validatePayloadSize('é', 'x'.repeat(122))).not.toThrow();
    expect(() => validatePayloadSize('é', 'x'.repeat(123))).toThrow('125 bytes');
    expect(() => validatePayloadSize('k', `${'🙂'.repeat(30)}abc`)).not.toThrow();
    expect(() => validatePayloadSize('k', '🙂'.repeat(31))).toThrow('125 bytes');
  });

  it('preserves ordinary asset and widget conversion and serialization', () => {
    const asset = convertToDriveFile(rawFile({ type: 'asset', kind: 'image', title: 'Image', showTitle: 'true' }));
    expect(serializeAppProperties(asset.appProperties)).toEqual({ type: 'asset', kind: 'image', title: 'Image', showTitle: 'true', preview: null });
    const widget = convertToDriveFile(rawFile({ type: 'widget', template: 'markdown', title: 'Title' }));
    expect(serializeAppProperties(widget.appProperties)).toEqual({ type: 'widget', template: 'markdown', title: 'Title', firestoreId: null });
  });
});

describe('crop upload', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends both property sets and media together, leaving ordinary uploads unchanged', async () => {
    const fetch = vi.fn().mockResolvedValue({ id: 'uploaded' });
    vi.stubGlobal('$fetch', fetch);
    vi.stubGlobal('useDriveStore', () => ({ getAuthorizationInfo: async () => ({ accessToken: 'test' }) }));
    const file = new File(['pixels'], 'crop.png', { type: 'image/png' });
    await uploadCropMedia(file, 'folder', crop, { name: 'new.png' });
    const [url, options] = fetch.mock.calls[0]!;
    expect(url).toContain('uploadType=multipart');
    const form = options.body as FormData;
    const metadata = JSON.parse(await (form.get('metadata') as Blob).text());
    expect(metadata).toEqual({ name: 'new.png', mimeType: 'image/png', parents: ['folder'], appProperties: wire, properties: { mtc: '1' } });
    expect(await (form.get('file') as File).text()).toBe('pixels');
    await uploadRawMedia(file, 'folder');
    const ordinary = JSON.parse(await (fetch.mock.calls[1]![1].body.get('metadata') as Blob).text());
    expect(ordinary).toEqual({ name: 'crop.png', mimeType: 'image/png', parents: ['folder'] });
    await expect(uploadCropMedia(file, 'folder', { ...crop, checksum: 'bad' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
