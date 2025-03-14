export const ID_PLACEHOLDER = Symbol('id-placeholder');

export type IdPlaceholder = typeof ID_PLACEHOLDER;
export type WithIdPlaceholder<T> = T extends string ? string | IdPlaceholder : T;
export type WithIdPlaceholders<T> = {
  [K in keyof T]: T[K] extends string
    ? WithIdPlaceholder<T[K]>
    : T[K] extends object
      ? WithIdPlaceholders<T[K]>
      : T[K];
};
/**
 * Recursively replaces ID_PLACEHOLDER with the provided ID throughout an object
 */
export function replaceIdPlaceholder<T extends Object> (obj: WithIdPlaceholders<T>, id: string): T {
  if (obj === null || typeof obj !== 'object') {
    return obj === ID_PLACEHOLDER ? id as unknown as T : obj as T;
  }

  if (Array.isArray(obj)) {
    throw new TypeError('Does not support array');
  }

  const entries = Object.entries(obj as Record<string, unknown>).map(
    ([key, value]) => [
      key,
      value === ID_PLACEHOLDER
        ? id
        : typeof value === 'object' && value !== null
          ? replaceIdPlaceholder(value, id)
          : value,
    ],
  );

  return Object.fromEntries(entries) as T;
}
