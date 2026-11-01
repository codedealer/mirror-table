import type { CropProperties, CropProvenance } from '~/models/types';
import { isCropRectangle } from '~/models/CropRectangle';
import { validateDrivePropertySize } from '~/models/DrivePropertyValidation';
import { AppPropertiesTypes, isObject } from '~/models/types';

export const cropMarker = { mtc: '1' } as const;
export const isCropProperties = (value: unknown): value is CropProperties => {
  return isObject(value)
    && value.type === AppPropertiesTypes.DEPENDENCY && value.kind === 'c'
    && typeof value.originalId === 'string' && /^[\w-]+$/.test(value.originalId)
    && typeof value.checksum === 'string' && /^[0-9a-f]{32}$/.test(value.checksum)
    && isCropRectangle(value.rectangle);
};

/** Validate every wire property before use, without truncating values. */
export const serializeCropProperties = (value: CropProperties): Record<string, string> => {
  if (!isCropProperties(value))
    throw new Error('Invalid crop provenance');
  const { x, y, w, h } = value.rectangle;
  const properties = { type: 'dependency', k: 'c', o: value.originalId, m: value.checksum, c: `1,${x},${y},${w},${h}` };
  for (const [key, payload] of Object.entries({ ...properties, ...cropMarker })) {
    validateDrivePropertySize(key, payload);
  }
  return properties;
};

export const parseCropProperties = (wire: unknown): CropProperties | undefined => {
  if (!isObject(wire) || wire.type !== 'dependency' || wire.k !== 'c'
    || typeof wire.o !== 'string' || typeof wire.m !== 'string' || typeof wire.c !== 'string') {
    return undefined;
  }
  // Only canonical unsigned decimal integers and version 1 are accepted.
  const match = /^1,(0|[1-9]\d*),(0|[1-9]\d*),(0|[1-9]\d*),(0|[1-9]\d*)$/.exec(wire.c);
  if (!match)
    return undefined;
  const value: CropProperties = {
    type: 'dependency',
    kind: 'c',
    originalId: wire.o,
    checksum: wire.m,
    rectangle: { x: Number(match[1]), y: Number(match[2]), w: Number(match[3]), h: Number(match[4]) },
  };
  try {
    serializeCropProperties(value);
    return value;
  } catch {
    return undefined;
  }
};

/** 'Usable' means structurally valid only: the caller must still check Original access and checksum. */
export const getCropProvenance = (appProperties: unknown, properties: unknown): CropProvenance => {
  const crop = parseCropProperties(appProperties);
  if (crop)
    return { status: 'usable', properties: crop };
  if ((isObject(properties) && properties.mtc === '1')
    || (isObject(appProperties) && appProperties.type === 'dependency')) {
    return { status: 'unavailable' };
  }
  return { status: 'original' };
};
