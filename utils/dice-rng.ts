import type { RandomGenerator } from '~/models/Dice';

export const cryptoRNG: RandomGenerator = async (min, max) => {
  const range = max - min + 1;
  const byteArray = new Uint32Array(1);
  crypto.getRandomValues(byteArray);
  return min + (byteArray[0] % range);
};

export const RANDOM_ORG_SAMPLE_SIZE = 100;
export const RANDOM_ORG_LOW_WATERMARK = Math.floor(RANDOM_ORG_SAMPLE_SIZE * 0.2);

interface RandomOrgResponse {
  numbers: number[];
}

type RandomOrgFetcher = (sides: number) => Promise<number[]>;

interface RandomBucket {
  values: number[];
  refill?: Promise<void>;
}

const fetchRandomOrgValues: RandomOrgFetcher = async (sides) => {
  const userStore = useUserStore();
  const idToken = await userStore.user?.getIdToken();

  if (!idToken) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch('/api/dice/random', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'x-id-token': idToken,
    },
    body: JSON.stringify({ sides }),
  });

  if (!response.ok)
    throw new Error(`Random source request failed (${response.status})`);

  const payload = await response.json() as RandomOrgResponse;
  if (!Array.isArray(payload.numbers) || payload.numbers.length === 0)
    throw new Error('Random source returned no values');

  return payload.numbers;
};

export const createRandomOrgRNG = (
  fetcher: RandomOrgFetcher = fetchRandomOrgValues,
): RandomGenerator => {
  const buckets = new Map<number, RandomBucket>();

  const refill = (sides: number, bucket: RandomBucket): Promise<void> => {
    if (bucket.refill)
      return bucket.refill;

    bucket.refill = fetcher(sides)
      .then((values) => {
        if (values.some(value => !Number.isInteger(value) || value < 1 || value > sides))
          throw new Error('Random source returned an out-of-range value');
        bucket.values.push(...values);
      })
      .finally(() => {
        bucket.refill = undefined;
      });

    return bucket.refill;
  };

  return async (min, max) => {
    if (min !== 1 || max < 2 || !Number.isInteger(max))
      throw new RangeError('Random.org dice RNG requires an integer range from 1 to sides');

    const sides = max;
    const bucket = buckets.get(sides) ?? { values: [] };
    buckets.set(sides, bucket);

    if (bucket.values.length === 0)
      await refill(sides, bucket);

    const value = bucket.values.shift();
    if (value === undefined)
      throw new Error('Random source returned no usable values');

    if (bucket.values.length <= RANDOM_ORG_LOW_WATERMARK)
      void refill(sides, bucket).catch(() => undefined);

    return value;
  };
};

export const randomOrgRNG = createRandomOrgRNG();
