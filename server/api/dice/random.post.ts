interface RandomOrgResponse {
  result?: {
    random?: {
      data?: number[];
    };
  };
  error?: {
    message?: string;
  };
}

const SAMPLE_SIZE = 100;

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { sides?: unknown } | undefined;
  const sides = body?.sides;

  if (typeof sides !== 'number' || !Number.isInteger(sides) || sides < 2 || sides > 1_000_000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sides must be an integer between 2 and 1000000',
    });
  }

  const config = useRuntimeConfig();
  if (!config.randomApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Random source is not configured',
    });
  }

  const response = await fetch('https://api.random.org/json-rpc/2/invoke', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'generateIntegers',
      params: {
        apiKey: config.randomApiKey,
        n: SAMPLE_SIZE,
        min: 1,
        max: sides,
        replacement: true,
        base: 10,
      },
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Random.org request failed (${response.status})`,
    });
  }

  const payload = await response.json() as RandomOrgResponse;
  const numbers = payload.result?.random?.data;
  if (payload.error || !numbers?.length) {
    throw createError({
      statusCode: 502,
      statusMessage: payload.error?.message ?? 'Random.org returned no values',
    });
  }

  return { numbers };
});
