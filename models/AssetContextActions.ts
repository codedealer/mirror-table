import type { DriveAsset, DriveFileContextAction, TreeNode } from '~/models/types';

export const AssetContextActionsFactory = (file: DriveAsset, node: TreeNode) => {
  const driveTreeStore = useDriveTreeStore();

  const actions: DriveFileContextAction[] = [];

  actions.push({
    label: 'Delete',
    icon: { name: 'delete', color: 'danger' },
    action: () => driveTreeStore.removeFile(node),
    disabled: !file.capabilities?.canDelete,
    pinned: false,
    alwaysVisible: false,
  });

  return actions;
};
