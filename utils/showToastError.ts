import { isObject } from '~/models/types';

export const showToastError = (e: unknown) => {
  const { init } = useToast();
  let message = typeof e === 'string' ? e : null;
  if (message === null) {
    if (!isObject(e)) {
      message = 'Unknown error';
    } else if ('result' in e && isGapiErrorResponseResult(e.result)) {
      message = e.result.error.message;
    } else if ('message' in e) {
      message = e.message as string;
    }
  }
  init({
    message: message ?? 'Unknown error',
    color: 'danger',
  });
};
