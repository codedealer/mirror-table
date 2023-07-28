export const expiryFromSeconds = (seconds: number | string): number => {
  const lifetime = Number(seconds);
  if (Number.isNaN(lifetime)) {
    throw new TypeError('Invalid expiry');
  }
  return Date.now() + lifetime * 1000;
};
