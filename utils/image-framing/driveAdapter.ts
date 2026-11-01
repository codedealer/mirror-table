import type { Frame } from './geometry';
import type { CropProperties, DriveFile } from '~/models/types';
import { getCropProvenance, isCropProperties } from '~/models/CropProperties';
import { AppPropertiesTypes, DataRetrievalStrategies } from '~/models/types';
import { convertToBlob, uploadCropMedia } from '~/utils/driveOps';
import { targetSize } from './geometry';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface DriveCropSource {
  original: DriveFile;
  blob: Blob;
}

const frameFromCrop = (crop: CropProperties): Frame => ({ ...crop.rectangle });
const sameRectangle = (left: Frame, right: Frame) => left.x === right.x
  && left.y === right.y
  && left.w === right.w
  && left.h === right.h;
const isMd5Checksum = (value: string | undefined): value is string => !!value && /^[a-f0-9]{32}$/.test(value);

/** Authenticated, Original-based adapter shared by editable Drive thumbnail callers. */
export const createDriveCropSessionAdapter = (getDestinationFolderId: string | (() => string)) => {
  const destinationFolderId = () => typeof getDestinationFolderId === 'function' ? getDestinationFolderId() : getDestinationFolderId;
  const driveFiles = useDriveFileStore();
  const resolveOriginal = async (id: string) => {
    const result = await driveFiles.getFile(id, DataRetrievalStrategies.SOURCE);
    if (result.error || !result.file || result.file.trashed)
      throw new Error('This image is unavailable or has been removed.');
    const file = result.file;
    if (!file.mimeType?.startsWith('image/') || !isMd5Checksum(file.md5Checksum))
      throw new Error('This file is not a downloadable image with a valid checksum.');

    const provenance = file.cropProvenance ?? getCropProvenance(file.appProperties, file.properties);
    let originalId = file.id;
    let frame: Frame | undefined;
    let checksum = file.md5Checksum;
    if (provenance.status === 'unavailable')
      throw new Error('This Cropped Image has unavailable or invalid provenance and cannot be re-edited.');
    if (provenance.status === 'usable') {
      originalId = provenance.properties.originalId;
      frame = frameFromCrop(provenance.properties);
      checksum = provenance.properties.checksum;
    }

    // The selected file is already a fresh metadata read when it is itself the Original.
    const originalResult = originalId === file.id
      ? { file }
      : await driveFiles.getFile(originalId, DataRetrievalStrategies.SOURCE);
    const original = originalResult.file;
    if (originalResult.error || !original || original.trashed || !original.capabilities?.canDownload)
      throw new Error('The Original is missing or cannot be accessed; this crop remains displayable.');
    if (original.cropProvenance?.status === 'usable' || original.cropProvenance?.status === 'unavailable')
      throw new Error('Crop provenance does not point directly to an Original image.');
    if (!isMd5Checksum(original.md5Checksum) || original.md5Checksum !== checksum)
      throw new Error('The Original has changed since this crop was created.');
    if (!supportedMimeTypes.has(original.mimeType ?? ''))
      throw new Error('Choose a JPEG, PNG or WebP image.');
    const size = Number(original.size);
    if (Number.isFinite(size) && size > MAX_IMAGE_SIZE)
      throw new Error('Image exceeds the 20 MB limit.');

    // LAZY checks media cache using the already-preflighted current Drive checksum,
    // then downloads only on a cache miss. Do not fetch metadata again after retrieval.
    const media = await driveFiles.downloadMedia(original, DataRetrievalStrategies.LAZY);
    if (!media || media.md5Checksum !== original.md5Checksum)
      throw new Error('The downloaded Original metadata does not match the current Drive checksum.');
    const blob = convertToBlob(media);
    if (blob.size > MAX_IMAGE_SIZE)
      throw new Error('Image exceeds the 20 MB limit.');
    return { source: { original, blob }, frame };
  };

  return {
    resolve: resolveOriginal,
    upload: async (source: DriveCropSource, blob: Blob, frame: Frame, ratio: number) => {
      const folderId = destinationFolderId();
      if (!folderId)
        throw new Error('A destination folder is required to create a Cropped Image.');
      targetSize(ratio);
      if (source.original.md5Checksum == null)
        throw new Error('The Original has no checksum.');
      const crop: CropProperties = {
        type: AppPropertiesTypes.DEPENDENCY,
        kind: 'c',
        originalId: source.original.id,
        checksum: source.original.md5Checksum,
        rectangle: { ...frame },
      };
      const image = new File([blob], `${source.original.name || 'image'}-crop.png`, { type: blob.type || 'image/png' });
      const uploaded = await uploadCropMedia(image, folderId, crop);
      if (!uploaded.id)
        throw new Error('Drive did not return an ID for the Cropped Image.');
      return uploaded.id;
    },
    validate: async (id: string, source: DriveCropSource, frame: Frame, ratio: number) => {
      const result = await driveFiles.getFile(id, DataRetrievalStrategies.SOURCE);
      const cropFile = result.file;
      if (result.error || !cropFile || cropFile.trashed || !cropFile.md5Checksum)
        throw new Error('Drive did not return readable metadata for the uploaded crop.');
      const provenance = cropFile.cropProvenance ?? getCropProvenance(cropFile.appProperties, cropFile.properties);
      if (provenance.status !== 'usable' || !isCropProperties(provenance.properties)
        || provenance.properties.originalId !== source.original.id
        || provenance.properties.checksum !== source.original.md5Checksum
        || !sameRectangle(provenance.properties.rectangle, frame)
        || cropFile.properties?.mtc !== '1') {
        throw new Error('The uploaded crop provenance could not be verified.');
      }
      const expected = targetSize(ratio);
      const actual = cropFile.imageMediaMetadata;
      if (!actual?.width || !actual.height || actual.width !== expected.width || actual.height !== expected.height)
        throw new Error('Drive did not report the expected crop dimensions.');
      const currentOriginal = await driveFiles.getFile(source.original.id, DataRetrievalStrategies.SOURCE);
      if (currentOriginal.error || !currentOriginal.file || currentOriginal.file.trashed
        || currentOriginal.file.md5Checksum !== source.original.md5Checksum) {
        throw new Error('The Original changed before the crop could be applied.');
      }
    },
    trash: async (id: string) => {
      // Only IDs created by this CropSession are ever passed to this method.
      await driveFiles.removeFile(id, false);
    },
  };
};
