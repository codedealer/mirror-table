import type { AppProperties } from '~/models/types';
import { isAssetProperties } from '~/models/types';

export const serializeAppProperties = (appProperties?: AppProperties): Record<string, string> => {
  if (isAssetProperties(appProperties)) {
    return plainObjFromAssetProperties(appProperties);
  }

  throw new Error('Not implemented');
};
