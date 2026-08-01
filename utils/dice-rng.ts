import type { RandomGenerator } from '~/models/Dice';

// Default RNG for the /dev prototype (see §7.1 / ADR 0001). Production will substitute
// a batched random.org implementation behind the same async RandomGenerator boundary.
export const cryptoRNG: RandomGenerator = async (min, max) => {
  const range = max - min + 1;
  const byteArray = new Uint32Array(1);
  crypto.getRandomValues(byteArray);
  return min + (byteArray[0] % range);
};
