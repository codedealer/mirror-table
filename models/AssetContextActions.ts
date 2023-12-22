import type { DriveAsset, DriveFileContextAction, TreeNode } from '~/models/types';

export const AssetContextActionsFactory = (file: DriveAsset, node: TreeNode) => {
  const driveTreeStore = useDriveTreeStore();
  const sceneStore = useSceneStore();

  const actions: DriveFileContextAction[] = [];

  actions.push({
    label: 'Send to Scene',
    icon: { name: 'token', color: 'primary' },
    action: () => sceneStore.addAsset(file),
    disabled: !file.capabilities?.canDownload || !file.appProperties.preview,
    pinned: false,
    alwaysVisible: false,
  });

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
