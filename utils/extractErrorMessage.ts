import { isObject } from '~/models/types';

export const extractErrorMessage = (e: unknown) => {
  if (typeof e === 'string') {
    return e;
  }

  let message = 'Unknown error';
  if (!isObject(e)) {
    return message;
  } else if ('result' in e && isGapiErrorResponseResult(e.result)) {
    message = e.result.error.message;
  } else if ('message' in e) {
    message = e.message as string;
  }

  return message;
};
