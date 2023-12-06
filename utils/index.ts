export const expiryFromSeconds = (seconds: number | string): number => {
  const lifetime = Number(seconds);
  if (Number.isNaN(lifetime)) {
    throw new TypeError('Invalid expiry');
  }
  return Date.now() + lifetime * 1000;
};

export const idToSlug = (id: string): string => {
  // take the first 3 and the last 3 characters of the id
  const start = id.substring(0, 3);
  const end = id.substring(id.length - 3);
  return `${start}${end}`;
};

export const aspectRatio = (width?: number | string, height?: number | string): number => {
  if (
    !width ||
    !height ||
    Number.isNaN(Number(width)) ||
    Number.isNaN(Number(height)) ||
    Number(height) === 0
  ) {
    return 1;
  }

  return Number(width) / Number(height);
};

export const calculateNumberOfElements = (containerWidth: unknown, elementWidth: unknown): number => {
  if (
    !containerWidth ||
    !elementWidth ||
    Number.isNaN(Number(containerWidth)) ||
    Number.isNaN(Number(elementWidth)) ||
    Number(elementWidth) === 0
  ) {
    return 1;
  }

  return Math.floor(Number(containerWidth) / Number(elementWidth)) || 1;
};

export const stripFileExtension = (filename: string): string => {
  const index = filename.lastIndexOf('.');
  if (index === -1) {
    return filename;
  }

  return filename.substring(0, index);
};

export const nameValidationsRules = [
  (v: string) => /^[^\\/:*?"<>|]{0,100}$/.test(v) || 'No special symbols in name',
  (v: string) => v.length > 0 || 'Fill out the name',
];
