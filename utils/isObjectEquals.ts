const equal = <T extends Object, V extends T>(
  obj: T,
  origin: V,
  compare: (a: unknown, b: unknown, key: string | number | symbol) => boolean,
): boolean => {
  for (const k of Object.keys(obj)) {
    const key = k as keyof T;
    if (!Object.hasOwn(origin, key)) {
      throw new Error(`Key ${String(key)} not found in origin object`);
    }

    if (isObject(obj[key])) {
      if (!isObject(origin[key])) {
        return false;
      }

      if (
        !equal(obj[key], origin[key], compare)
      ) {
        return false;
      }

      continue;
    }

    if (typeof obj[key] !== typeof origin[key]) {
      return false;
    }

    if (!compare(obj[key], origin[key], key)) {
      return false;
    }
  }

  return true;
};

export default equal;
