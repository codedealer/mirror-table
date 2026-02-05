import type { ContextAction, DriveAsset, DriveFile, DriveWidget, ModalWindow } from '~/models/types';
import { AssetContextActionsFactory } from '~/models/AssetContextActions';
import { isDriveAsset, isDriveWidget } from '~/models/types';
import { WidgetContextActionsFactory } from '~/models/WidgetContextActions';

type WindowContextActionsFileRef =
  | Ref<DriveFile | undefined>
  | Ref<DriveAsset | undefined>
  | Ref<DriveWidget | undefined>;

export const useWindowContextActions = (
  file: WindowContextActionsFileRef,
  window: Ref<ModalWindow>,
) => {
  const windowStore = useWindowStore();

  const _closeWindow = () => {
    // ensure it's removed even if pinned
    if (window.value.pinned) {
      windowStore.unpin(window.value);
    }

    window.value.active = false;
    windowStore.remove(window.value);
  };

  const actions = computed<ContextAction[]>(() => {
    if (!file.value) {
      return [];
    }

    if (file.value.trashed) {
      const restoreAction: ContextAction = {
        id: 'restore',
        label: 'Restore',
        icon: { name: 'replay', color: 'primary-dark' },
        action: async () => {
          try {
            const driveFileStore = useDriveFileStore();
            await driveFileStore.removeFile(file.value!.id, true);
          } catch (e) {
            const notificationStore = useNotificationStore();
            notificationStore.error(extractErrorMessage(e));
            console.error(e);
          }
        },
        disabled: !file.value.capabilities?.canDelete,
        pinned: false,
        alwaysVisible: true,
      };

      return [restoreAction];
    }

    if (isDriveWidget(file.value)) {
      const widgetFile = file.value;
      const baseActions = WidgetContextActionsFactory(widgetFile);

      const deleteAction: ContextAction = {
        id: 'delete',
        label: 'Delete',
        icon: { name: 'delete', color: 'danger' },
        action: async () => {
          try {
            const driveFileStore = useDriveFileStore();
            await driveFileStore.removeFile(widgetFile.id, false);

            // closeWindow();
          } catch (e) {
            const notificationStore = useNotificationStore();
            notificationStore.error(extractErrorMessage(e));
            console.error(e);
          }
        },
        disabled: !!widgetFile.trashed || !widgetFile.capabilities?.canDelete,
        pinned: false,
        alwaysVisible: false,
      };

      return [...baseActions, deleteAction];
    }

    if (isDriveAsset(file.value)) {
      const assetFile = file.value;
      const baseActions = AssetContextActionsFactory(assetFile);

      const deleteAction: ContextAction = {
        id: 'delete',
        label: 'Delete',
        icon: { name: 'delete', color: 'danger' },
        action: async () => {
          try {
            const driveFileStore = useDriveFileStore();
            await driveFileStore.removeFile(assetFile.id, false);

            // closeWindow();
          } catch (e) {
            const notificationStore = useNotificationStore();
            notificationStore.error(extractErrorMessage(e));
            console.error(e);
          }
        },
        disabled: !!assetFile.trashed || !assetFile.capabilities?.canDelete,
        pinned: false,
        alwaysVisible: false,
      };

      return [...baseActions, deleteAction];
    }

    return [];
  });

  return {
    actions,
  };
};
