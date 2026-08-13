import { type TableMode, TableModes, type TablePermissions } from '~/models/types';

export const isCanvasZoomControlVisible = (
  mode: TableMode | undefined,
  permissions: Pick<TablePermissions, 'isOwner' | 'isEditor'>,
) => {
  return (
    (permissions.isOwner || permissions.isEditor)
    && mode !== undefined
    && mode !== TableModes.PRESENTATION
  );
};
