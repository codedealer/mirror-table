import type { UpdateData } from '@firebase/firestore';
import type { NestedPartial } from '~/models/types';

const makeFirestoreUpdateData = <T>(obj: NestedPartial<T>, prefix = ''): UpdateData<T> => {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key as keyof T];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const flattened = makeFirestoreUpdateData(value as NestedPartial<T>, path);
      Object.assign(acc, flattened);
    } else {
      acc[path] = value;
    }
    return acc;
  }, {} as UpdateData<T>);
};

export default makeFirestoreUpdateData;
