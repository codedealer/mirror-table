export const expiryFromSeconds = (seconds: number | string): number => {
  const lifetime = Number(seconds);
  if (Number.isNaN(lifetime)) {
    throw new TypeError('Invalid expiry');
  }
  return Date.now() + lifetime * 1000;
};

export const idToSlug = (id: string): string => {
  // take the first 5 and the last 5 characters of the id
  const start = id.substring(0, 5);
  const end = id.substring(id.length - 5);
  return `${start}${end}`;
};
