import type { ContextAction, DriveFile, TreeNode } from '~/models/types';
import { AssetPropertiesKinds } from '~/models/types';
import { generateSelectOptions } from '~/models/AssetProperties';

export const useDriveFolderContextActions = (
  file: Ref<DriveFile | undefined>,
  node: Ref<TreeNode>,
  path: Ref<number[] | undefined>,
) => {
  const tableStore = useTableStore();
  const driveTreeStore = useDriveTreeStore();

  const permissions = computed(() => ({
    canAddChildren: (
      driveTreeStore.isRootFolder
        ? tableStore.permissions.isOwner
        : file.value?.capabilities?.canAddChildren
    ),
    // if path is undefined, we are in the root folder
    canDelete: (
      path.value && file.value?.capabilities?.canDelete
    ),
  }));

  const actions = computed(() => {
    const actions: ContextAction[] = [];

    if (!file.value) {
      return actions;
    }

    if (!path.value) {
      actions.push({
        id: 'parent-folder',
        label: 'Go to parent folder',
        icon: { name: 'drive_folder_upload', color: 'primary-dark' },
        action: async () => {
          await driveTreeStore.setRootToParent();
        },
        disabled: driveTreeStore.isRootFolder,
        pinned: true,
        alwaysVisible: true,
      });
    }

    actions.push({
      id: 'add-folder',
      label: 'Add folder',
      icon: { name: 'folder', color: 'primary' },
      action: () => {
        const driveTreeModalStore = useDriveTreeModalStore();

        driveTreeModalStore.show(
          'New folder',
          DriveMimeTypes.FOLDER,
          node.value,
          path.value,
        );
      },
      disabled: !permissions.value.canAddChildren,
      pinned: false,
      alwaysVisible: false,
    });

    actions.push({
      id: 'add-file',
      label: 'Add asset',
      icon: { name: 'post_add', color: 'primary' },
      action: () => {
        const driveTreeModalStore = useDriveTreeModalStore();

        driveTreeModalStore.show(
          'New asset',
          DriveMimeTypes.MARKDOWN,
          node.value,
          path.value,
          generateSelectOptions(),
        );
      },
      disabled: !permissions.value.canAddChildren,
      pinned: false,
      alwaysVisible: false,
    });

    actions.push({
      id: 'import-image',
      label: 'Import: images',
      icon: { name: 'add_photo_alternate', color: 'secondary' },
      action: async () => {
        await driveTreeStore.importImages(
          AssetPropertiesKinds.IMAGE,
          node.value,
          path.value,
        );
      },
      disabled: !permissions.value.canAddChildren,
      pinned: false,
      alwaysVisible: false,
    });

    actions.push({
      id: 'import-asset',
      label: 'Import: images as assets',
      icon: { name: 'post_add', color: 'secondary' },
      action: async () => {
        await driveTreeStore.importImages(
          AssetPropertiesKinds.COMPLEX,
          node.value,
          path.value,
        );
      },
      disabled: !permissions.value.canAddChildren,
      pinned: false,
      alwaysVisible: false,
    });

    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: { name: 'delete', color: 'danger' },
      action: () => driveTreeStore.removeFile(node.value),
      disabled: !permissions.value.canDelete,
      pinned: false,
      alwaysVisible: false,
    });

    return actions;
  });

  return {
    actions,
  };
};
