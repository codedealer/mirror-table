import type { DriveFile, TreeNode } from '~/models/types';
import { AssetContextActionsFactory } from '~/models/AssetContextActions';
import { isDriveWidget } from '~/models/types';
import { WidgetContextActionsFactory } from '~/models/WidgetContextActions';

export const useDriveFileContextActions = (
  file: Ref<DriveFile | undefined>,
  node: Ref<TreeNode>,
) => {
  const actions = computed(() => {
    if (!file.value) {
      return [];
    }

    if (isDriveWidget(file.value)) {
      return WidgetContextActionsFactory(file.value, node.value);
    } else if (isDriveAsset(file.value)) {
      return AssetContextActionsFactory(file.value, node.value);
    }

    return [];
  });

  return {
    actions,
  };
};
