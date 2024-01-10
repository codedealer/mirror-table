import type { ContextAction, DriveAsset, TreeNode } from '~/models/types';

export const AssetContextActionsFactory = (file: DriveAsset, node?: TreeNode) => {
  const driveTreeStore = useDriveTreeStore();
  const sceneStore = useSceneStore();

  const actions: ContextAction[] = [];

  if (file.appProperties.kind !== AssetPropertiesKinds.TEXT) {
    actions.push({
      id: 'send-to-scene',
      label: 'Send to Scene',
      icon: { name: 'token', color: 'primary' },
      action: () => sceneStore.addAsset(file),
      disabled: !file.capabilities?.canDownload || !file.appProperties.preview,
      pinned: true,
      alwaysVisible: false,
    });
  }

  actions.push({
    id: 'send-to-screen',
    label: 'Make a Title Screen',
    icon: { name: 'dvr', color: 'primary' },
    action: () => sceneStore.addScreen(file.id, file.appProperties?.preview?.id),
    disabled: (!file.size || file.size === '0') && !file.appProperties?.preview?.id,
    pinned: true,
    alwaysVisible: false,
  });

  if (node) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: { name: 'delete', color: 'danger' },
      action: () => driveTreeStore.removeFile(node),
      disabled: !file.capabilities?.canDelete,
      pinned: false,
      alwaysVisible: false,
    });
  }

  return actions;
};
