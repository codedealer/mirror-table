import type { DriveFile, TreeNode } from '~/models/types';
import { AssetContextActionsFactory } from '~/models/AssetContextActions';

export const useDriveFileContextActions = (
  file: Ref<DriveFile | undefined>,
  node: Ref<TreeNode>,
) => {
  const actions = computed(() => {
    if (!file.value || !isDriveAsset(file.value)) {
      return [];
    }

    return AssetContextActionsFactory(file.value, node.value);
  });

  return {
    actions,
  };
};
