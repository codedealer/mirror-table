import type { CropProperties, CropProvenance, DriveFile } from '~/models/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPropertiesTypes } from '~/models/types';
import { createDriveCropSessionAdapter } from './driveAdapter';

const drive = vi.hoisted(() => ({
  convertToBlob: vi.fn((media: { data: string }) => new Blob([media.data], { type: 'image/png' })),
  uploadCropMedia: vi.fn(async () => ({ id: 'uploaded-crop' })),
}));
vi.mock('~/utils/driveOps', () => drive);

const checksum = 'f3cf72fc0f0659f121e3fb02f0bc6504';
const frame = { x: 0, y: 0, w: 1_000_000, h: 1_000_000 };
const originalFile = (): DriveFile => ({
  id: 'original',
  name: 'original.png',
  mimeType: 'image/png',
  md5Checksum: checksum,
  trashed: false,
  ownedByMe: true,
  originalFilename: 'original.png',
  shared: false,
  size: '4',
  capabilities: { canDownload: true },
  imageMediaMetadata: { width: 512, height: 512 },
  loading: false,
  loadedAt: 0,
  cropProvenance: { status: 'original' },
});
function cropFile(provenance: CropProvenance = { status: 'usable', properties: {
  type: 'dependency',
  kind: 'c',
  originalId: 'original',
  checksum,
  rectangle: frame,
} }): DriveFile {
  return {
    ...originalFile(),
    id: 'crop',
    name: 'crop.png',
    properties: { mtc: '1' },
    imageMediaMetadata: { width: 512, height: 512 },
    cropProvenance: provenance,
  };
}
function mockStore(files: Record<string, DriveFile>, bytes = 'authenticated-original') {
  const getFile = vi.fn(async (id: string) => ({ file: files[id] }));
  const downloadMedia = vi.fn(async (_file: DriveFile, _mediaStrategy: string) => ({ id: 'original', md5Checksum: files.original?.md5Checksum ?? checksum, data: bytes, loadedAt: 0 }));
  const removeFile = vi.fn(async () => {});
  vi.stubGlobal('useDriveFileStore', () => ({ getFile, downloadMedia, removeFile }));
  return { getFile, downloadMedia, removeFile };
}

describe('drive crop adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('resolves authenticated Original media, checks the recorded checksum and restores its frame', async () => {
    const crop = cropFile();
    crop.cropProvenance = { status: 'usable', properties: {
      type: AppPropertiesTypes.DEPENDENCY,
      kind: 'c',
      originalId: 'original',
      checksum,
      rectangle: frame,
    } as CropProperties };
    const store = mockStore({ crop, original: originalFile() });
    const adapter = createDriveCropSessionAdapter('destination');
    const result = await adapter.resolve('crop');
    expect(result.source.original.id).toBe('original');
    expect(result.source.blob.type).toBe('image/png');
    expect(await result.source.blob.text()).toBe('authenticated-original');
    expect(result.frame).toEqual(frame);
    expect(store.getFile).toHaveBeenCalledTimes(2);
    const [downloadedFile, mediaStrategy] = store.downloadMedia.mock.calls[0]!;
    expect(downloadedFile).toMatchObject({ id: 'original', md5Checksum: checksum });
    expect(mediaStrategy).toBe('lazy');
  });

  it('requires a valid lowercase Drive MD5 before downloading the Original', async () => {
    const crop = cropFile();
    const store = mockStore({ crop, original: { ...originalFile(), md5Checksum: 'not-an-md5' } });
    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/changed/);
    expect(store.downloadMedia).not.toHaveBeenCalled();
  });

  it('reuses selected Original metadata and uses its fresh checksum for the media cache lookup', async () => {
    const currentChecksum = '6e7144040dd91e398fefbbb13cb8f519';
    const original = { ...originalFile(), md5Checksum: currentChecksum };
    const store = mockStore({ original });

    const result = await createDriveCropSessionAdapter('destination').resolve('original');

    expect(store.getFile).toHaveBeenCalledTimes(1);
    const [downloadedFile, mediaStrategy] = store.downloadMedia.mock.calls[0]!;
    expect(downloadedFile).toMatchObject({ md5Checksum: currentChecksum });
    expect(mediaStrategy).toBe('lazy');
    expect(result.source.original.md5Checksum).toBe(currentChecksum);
  });

  it('rejects unsupported and known-oversized Originals before retrieving media', async () => {
    const unsupported = mockStore({ crop: cropFile(), original: { ...originalFile(), mimeType: 'image/gif' } });
    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/JPEG, PNG or WebP/);
    expect(unsupported.downloadMedia).not.toHaveBeenCalled();

    const oversized = mockStore({ crop: cropFile(), original: { ...originalFile(), size: String(20 * 1024 * 1024 + 1) } });
    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/20 MB/);
    expect(oversized.downloadMedia).not.toHaveBeenCalled();
  });

  it('rejects an oversized returned Blob before the editor can decode it', async () => {
    const crop = cropFile();
    mockStore({ crop, original: originalFile() });
    drive.convertToBlob.mockReturnValueOnce(new Blob([new Uint8Array(20 * 1024 * 1024 + 1)], { type: 'image/png' }));
    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/20 MB/);
  });

  it('rejects inaccessible and changed Originals instead of silently editing the derivative', async () => {
    const crop = cropFile();
    const inaccessible = mockStore({ crop, original: { ...originalFile(), capabilities: { canDownload: false } } });
    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/cannot be accessed/);
    inaccessible.getFile.mockClear();

    const changed = mockStore({ crop, original: { ...originalFile(), md5Checksum: 'f'.repeat(32) } });
    await expect(createDriveCropSessionAdapter('destination').resolve('crop')).rejects.toThrow(/changed/);
    expect(changed.downloadMedia).not.toHaveBeenCalled();
  });

  it('uploads both metadata property sets through the same crop upload call', async () => {
    const store = mockStore({ original: originalFile() });
    let destination = 'first-folder';
    const adapter = createDriveCropSessionAdapter(() => destination);
    const source = { original: originalFile(), blob: new Blob(['source']) };
    destination = 'latest-folder';
    await adapter.upload(source, new Blob(['crop'], { type: 'image/png' }), frame, 1);
    expect(drive.uploadCropMedia).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/png' }),
      'latest-folder',
      expect.objectContaining({ originalId: 'original', checksum, rectangle: frame }),
    );
    expect(store.removeFile).not.toHaveBeenCalled();
  });

  it('compares read-back rectangle fields independent of property order', async () => {
    const crop = cropFile({ status: 'usable', properties: {
      type: AppPropertiesTypes.DEPENDENCY,
      kind: 'c',
      originalId: 'original',
      checksum,
      rectangle: { h: 1_000_000, w: 1_000_000, y: 0, x: 0 },
    } as CropProperties });
    const store = mockStore({ crop, original: originalFile() });
    const adapter = createDriveCropSessionAdapter('destination');
    const source = { original: originalFile(), blob: new Blob(['source']) };

    await expect(adapter.validate('crop', source, frame, 1)).resolves.toBeUndefined();

    const mismatched = cropFile({ status: 'usable', properties: {
      type: AppPropertiesTypes.DEPENDENCY,
      kind: 'c',
      originalId: 'original',
      checksum,
      rectangle: { h: 1_000_000, w: 1_000_000, y: 1, x: 0 },
    } as CropProperties });
    const mismatchedStore = mockStore({ crop: mismatched, original: originalFile() });
    const mismatchedAdapter = createDriveCropSessionAdapter('destination');
    await expect(mismatchedAdapter.validate('crop', source, frame, 1)).rejects.toThrow(/provenance/);
    expect(store.getFile).toHaveBeenCalledTimes(2);
    expect(mismatchedStore.getFile).toHaveBeenCalledTimes(1);
  });

  it('validates read-back provenance, marker and output dimensions before staging', async () => {
    const crop = cropFile();
    const store = mockStore({ crop, original: originalFile() });
    const adapter = createDriveCropSessionAdapter('destination');
    const source = { original: originalFile(), blob: new Blob(['source']) };
    await expect(adapter.validate('crop', source, frame, 1)).resolves.toBeUndefined();
    expect(store.getFile).toHaveBeenCalledTimes(2);
    const badStore = mockStore({ crop: { ...crop, properties: undefined }, original: originalFile() });
    await expect(createDriveCropSessionAdapter('destination').validate('crop', source, frame, 1)).rejects.toThrow(/provenance/);
    expect(badStore.getFile).toHaveBeenCalledTimes(1);
  });
});
