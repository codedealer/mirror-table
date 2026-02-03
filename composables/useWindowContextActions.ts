import type { ContextAction, DriveAsset, DriveFile, DriveWidget, ModalWindow } from '~/models/types';
import { AssetContextActionsFactory } from '~/models/AssetContextActions';
import { DynamicPanelModelTypes, isDriveAsset, isDriveWidget } from '~/models/types';
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

  const closeWindow = () => {
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

    if (isDriveWidget(file.value)) {
      const widgetFile = file.value;
      const baseActions = WidgetContextActionsFactory(widgetFile);

      const deleteAction: ContextAction = {
        id: 'delete',
        label: 'Delete',
        icon: { name: 'delete', color: 'danger' },
        action: async () => {
          try {
            const tableStore = useTableStore();

            if (widgetFile.appProperties.firestoreId) {
              // remove widget from all panels
              if (tableStore.table) {
                Object.values(DynamicPanelModelTypes).forEach((panel) => {
                  void tableStore.removeWidgetFromPanel(panel, widgetFile.appProperties.firestoreId!);
                });
              }

              const widgetStore = useWidgetStore();
              const result = await widgetStore.removeWidget(widgetFile.appProperties.firestoreId);
              if (!result) {
                return;
              }
            }

            const driveFileStore = useDriveFileStore();
            await driveFileStore.removeFile(widgetFile.id, false);

            closeWindow();
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

            closeWindow();
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
